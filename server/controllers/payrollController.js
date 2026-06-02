// Role du fichier: contient la logique backend de la paie.
import Attendance from "../models/Attendance.js";
import PayrollRun from "../models/PayrollRun.js";
import User from "../models/User.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeRole } from "../utils/roleNormalization.js";

const PAYROLL_ROLES = ["employee", "stagiaire", "comptable"];
const DEFAULT_BASE_SALARIES = {
  employee: 1400,
  stagiaire: 650,
  comptable: 1800,
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parsePeriod(period = currentPeriod()) {
  if (!/^\d{4}-\d{2}$/.test(String(period))) {
    throw new ApiError(400, "Period must use YYYY-MM format");
  }

  const [year, month] = String(period).split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return { period: String(period), start, end, year, month };
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

function displayName(user) {
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Utilisateur";
}

function getBaseSalary(user, overrides = {}) {
  const explicit = overrides[String(user._id)] ?? overrides[user.email];
  if (explicit !== undefined) {
    return Math.max(0, Number(explicit) || 0);
  }

  const profileSalary =
    user.payroll?.baseSalary ??
    user.salary ??
    user.compensation?.baseSalary;

  if (profileSalary !== undefined) {
    return Math.max(0, Number(profileSalary) || 0);
  }

  return DEFAULT_BASE_SALARIES[normalizeRole(user.role, "employee")] || DEFAULT_BASE_SALARIES.employee;
}

function computeEmployeePayroll({ user, attendance, workingDays, baseSalary }) {
  const presentStatuses = new Set(["present", "on_time", "late", "very_late"]);
  const workedDays = attendance.filter((record) => presentStatuses.has(record.status)).length;
  const absentDays = Math.max(0, workingDays - workedDays);
  const lateMinutes = attendance.reduce((sum, record) => sum + Number(record.delayMinutes || 0), 0);
  const dailyRate = workingDays ? baseSalary / workingDays : 0;
  const hourlyRate = dailyRate / 8;
  const absenceDeduction = absentDays * dailyRate;
  const lateDeduction = (lateMinutes / 60) * hourlyRate;
  const grossSalary = Math.max(0, baseSalary - absenceDeduction - lateDeduction);
  const cnss = grossSalary * 0.0918;
  const taxableSalary = Math.max(0, grossSalary - cnss);
  const incomeTax = taxableSalary * 0.08;
  const deductions = cnss + incomeTax;
  const netSalary = Math.max(0, grossSalary - deductions);
  const notes = [];

  if (absentDays > 0) notes.push(`${absentDays} absence(s) calculee(s) sur la periode.`);
  if (lateMinutes > 0) notes.push(`${lateMinutes} minute(s) de retard prises en compte.`);

  return {
    userId: user._id,
    name: displayName(user),
    email: user.email,
    role: normalizeRole(user.role || user.profileType, "employee"),
    baseSalary: roundMoney(baseSalary),
    workedDays,
    absentDays,
    lateMinutes,
    grossSalary: roundMoney(grossSalary),
    cnss: roundMoney(cnss),
    taxableSalary: roundMoney(taxableSalary),
    incomeTax: roundMoney(incomeTax),
    deductions: roundMoney(deductions),
    netSalary: roundMoney(netSalary),
    notes,
  };
}

function computeTotals(employees) {
  return employees.reduce(
    (totals, employee) => ({
      employeeCount: totals.employeeCount + 1,
      grossSalary: roundMoney(totals.grossSalary + employee.grossSalary),
      cnss: roundMoney(totals.cnss + employee.cnss),
      incomeTax: roundMoney(totals.incomeTax + employee.incomeTax),
      deductions: roundMoney(totals.deductions + employee.deductions),
      netSalary: roundMoney(totals.netSalary + employee.netSalary),
    }),
    { employeeCount: 0, grossSalary: 0, cnss: 0, incomeTax: 0, deductions: 0, netSalary: 0 },
  );
}

async function buildPayrollRun({ req, period, workingDays = 22, salaryOverrides = {} }) {
  const parsed = parsePeriod(period);
  const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : {};
  const users = await User.find({
    ...tenantFilter,
    isActive: { $ne: false },
    role: { $in: PAYROLL_ROLES },
  })
    .select("_id name firstName lastName email role profileType payroll salary compensation tenantId")
    .sort({ role: 1, name: 1 })
    .lean();

  const attendances = await Attendance.find({
    ...tenantFilter,
    date: { $gte: parsed.start, $lt: parsed.end },
  }).lean();

  const attendanceByUser = attendances.reduce((map, record) => {
    const key = String(record.userId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
    return map;
  }, new Map());

  const employees = users.map((user) =>
    computeEmployeePayroll({
      user,
      attendance: attendanceByUser.get(String(user._id)) || [],
      workingDays: Math.max(1, Number(workingDays) || 22),
      baseSalary: getBaseSalary(user, salaryOverrides),
    }),
  );

  return {
    tenantId: req.tenantId || null,
    period: parsed.period,
    currency: "TND",
    employees,
    totals: computeTotals(employees),
    generatedBy: req.user._id,
    meta: {
      workingDays: Math.max(1, Number(workingDays) || 22),
      attendanceRecords: attendances.length,
      generatedFrom: "attendance-and-user-profile",
    },
  };
}

export const listPayrollRuns = asyncHandler(async (req, res) => {
  const filter = req.tenantId ? { tenantId: req.tenantId } : {};
  const records = await PayrollRun.find(filter)
    .populate("generatedBy", "name firstName lastName email role")
    .populate("approvedBy", "name firstName lastName email role")
    .sort({ period: -1, createdAt: -1 })
    .limit(24)
    .lean();

  res.json(new ApiResponse(200, { records }, "Payroll runs retrieved"));
});

export const previewPayrollRun = asyncHandler(async (req, res) => {
  const run = await buildPayrollRun({
    req,
    period: req.query.period || req.body?.period,
    workingDays: req.query.workingDays || req.body?.workingDays,
    salaryOverrides: req.body?.salaryOverrides || {},
  });

  res.json(new ApiResponse(200, { payroll: run }, "Payroll preview generated"));
});

export const generatePayrollRun = asyncHandler(async (req, res) => {
  const runPayload = await buildPayrollRun({
    req,
    period: req.body?.period,
    workingDays: req.body?.workingDays,
    salaryOverrides: req.body?.salaryOverrides || {},
  });

  const payroll = await PayrollRun.findOneAndUpdate(
    { tenantId: runPayload.tenantId, period: runPayload.period },
    { $set: { ...runPayload, status: "draft" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(201).json(new ApiResponse(201, { payroll }, "Payroll run generated"));
});

export const getPayrollRun = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) };
  const payroll = await PayrollRun.findOne(filter)
    .populate("generatedBy", "name firstName lastName email role")
    .populate("approvedBy", "name firstName lastName email role");

  if (!payroll) {
    throw new ApiError(404, "Payroll run not found");
  }

  res.json(new ApiResponse(200, { payroll }, "Payroll run retrieved"));
});

export const updatePayrollStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["approved", "paid", "cancelled"].includes(status)) {
    throw new ApiError(400, "Status must be approved, paid, or cancelled");
  }

  const filter = { _id: req.params.id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) };
  const updates = { status };
  if (status === "approved") {
    updates.approvedBy = req.user._id;
    updates.approvedAt = new Date();
  }
  if (status === "paid") {
    updates.paidAt = new Date();
  }

  const payroll = await PayrollRun.findOneAndUpdate(filter, { $set: updates }, { new: true });
  if (!payroll) {
    throw new ApiError(404, "Payroll run not found");
  }

  res.json(new ApiResponse(200, { payroll }, "Payroll status updated"));
});
