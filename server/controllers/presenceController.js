import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { emitToRole, emitToTenant, emitToUser } from "../config/socket.js";
import * as notifService from "../services/notifService.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ATTENDANCE_ROLES = ["employee", "stagiaire", "comptable"];
const LATE_THRESHOLD_MINUTES = Number(process.env.PRESENCE_LATE_THRESHOLD_MINUTES || 30);
const VERY_LATE_THRESHOLD_MINUTES = Number(process.env.PRESENCE_VERY_LATE_THRESHOLD_MINUTES || 60);
const EXPECTED_START_TIME = process.env.PRESENCE_EXPECTED_START_TIME || "08:30";

// Role: Construit des donnees derivees.
function scopedFilter(req) {
  return req.tenantId ? { tenantId: req.tenantId } : {};
}

// Role: Recupere les donnees necessaires.
function getDateRange(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) {
    throw new ApiError(400, "Date must use YYYY-MM-DD format");
  }

  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end, dateKey };
}

// Role: Decrit la logique monthRange.
function monthRange(month, year) {
  const now = new Date();
  const safeYear = Number(year) || now.getFullYear();
  const safeMonth = Number(month) || now.getMonth() + 1;
  const start = new Date(safeYear, safeMonth - 1, 1);
  const end = new Date(safeYear, safeMonth, 1);
  return { start, end, year: safeYear, month: safeMonth };
}

// Role: Decrit la logique dateKeyFromDate.
function dateKeyFromDate(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Role: Prepare une valeur pour l affichage ou l API.
function normalizeStatus(status) {
  return status === "on_time" ? "present" : status;
}

// Role: Decrit la logique parseExpectedStartMinutes.
function parseExpectedStartMinutes(value = EXPECTED_START_TIME) {
  const [hours = "8", minutes = "30"] = String(value).split(":");
  return Number(hours) * 60 + Number(minutes);
}

// Role: Decrit la logique minutesSinceMidnight.
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Role: Decrit la logique statusFromDelay.
function statusFromDelay(delayMinutes) {
  if (delayMinutes > VERY_LATE_THRESHOLD_MINUTES) return "very_late";
  if (delayMinutes > LATE_THRESHOLD_MINUTES) return "late";
  return "present";
}

// Role: Construit des donnees derivees.
function buildUserSnapshot(user) {
  const firstName = String(user?.firstName || "").trim();
  const lastName = String(user?.lastName || "").trim();
  const name = String(user?.name || `${firstName} ${lastName}`.trim() || "User").trim();

  return {
    name,
    firstName,
    lastName,
    email: String(user?.email || "").trim().toLowerCase(),
    role: String(user?.role || user?.profileType || "").trim().toLowerCase(),
    profileType: String(user?.profileType || user?.role || "").trim().toLowerCase(),
  };
}

// Role: Prepare une valeur pour l affichage ou l API.
function formatClock(date) {
  return date ? new Date(date).toLocaleTimeString("en-GB", { hour12: false }) : null;
}

// Role: Prepare une valeur pour l affichage ou l API.
function serializePresence(record) {
  if (!record) return null;
  const raw = typeof record.toObject === "function" ? record.toObject() : record;
  const status = normalizeStatus(raw.status);

  return {
    ...raw,
    status,
    checkInTime: formatClock(raw.checkIn),
    checkOutTime: formatClock(raw.checkOut),
  };
}

// Role: Envoie un message ou une notification.
async function notifyTenantAdmins(req, payload) {
  const filter = { role: "admin", isActive: true };
  if (req.tenantId) filter.tenantId = req.tenantId;
  const admins = await User.find(filter).select("_id").lean();

  await Promise.all(
    admins.map((admin) =>
      notifService.create(admin._id, req.tenantId, {
        ...payload,
        source: payload.source || "presence_rules",
      }),
    ),
  );
}

// Role: Lance un traitement metier ou IA.
async function runPresenceRules(req, attendance) {
  const user = attendance.userId && typeof attendance.userId === "object" ? attendance.userId : req.user;
  const name = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "A user";

  if (attendance.delayMinutes > 60) {
    await notifyTenantAdmins(req, {
      type: "danger",
      title: "Very late check-in",
      message: `${name} checked in ${attendance.delayMinutes} minutes late.`,
      actionUrl: `/admin/presences/${attendance.dateKey}`,
      metadata: { attendanceId: attendance._id.toString(), userId: user?._id?.toString?.() },
    });
  }

  if (["late", "very_late"].includes(normalizeStatus(attendance.status))) {
    const monthStart = new Date(attendance.date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const lateCount = await Attendance.countDocuments({
      userId: attendance.userId?._id || attendance.userId,
      date: { $gte: monthStart, $lte: attendance.date },
      status: { $in: ["late", "very_late"] },
    });

    if (lateCount >= 3) {
      await notifyTenantAdmins(req, {
        type: "warning",
        title: "Repeated lateness",
        message: `${name} has been late ${lateCount} times this month.`,
        actionUrl: `/admin/presences/${attendance.dateKey}`,
        metadata: { attendanceId: attendance._id.toString(), userId: user?._id?.toString?.() },
      });
    }
  }
}

// Role: Recupere les donnees necessaires.
export const getPresenceCalendar = asyncHandler(async (req, res) => {
  const { start, end, month, year } = monthRange(req.query.month, req.query.year);
  const scope = scopedFilter(req);
  const role = String(req.query.role || "");
  const userFilter = {
    ...scope,
    isActive: true,
    role: role && role !== "all" ? role : { $in: ATTENDANCE_ROLES },
  };

  const [users, records] = await Promise.all([
    User.find(userFilter).select("_id role profileType").lean(),
    Attendance.find({
      ...scope,
      date: { $gte: start, $lt: end },
    }).lean(),
  ]);

  const allowedUserIds = new Set(users.map((user) => user._id.toString()));
  const totalUsers = users.length;
  const byDay = new Map();

  for (const record of records) {
    if (role && role !== "all" && !allowedUserIds.has(record.userId?.toString?.())) continue;
    const key = record.dateKey || dateKeyFromDate(record.date);
    const bucket = byDay.get(key) || { date: key, present: 0, absent: totalUsers, late: 0, veryLate: 0, totalUsers };
    const status = normalizeStatus(record.status);
    if (status === "present") bucket.present += 1;
    if (status === "late") bucket.late += 1;
    if (status === "very_late") bucket.veryLate += 1;
    byDay.set(key, bucket);
  }

  const days = [];
  for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
    const key = dateKeyFromDate(day);
    const bucket = byDay.get(key) || { date: key, present: 0, absent: totalUsers, late: 0, veryLate: 0, totalUsers };
    const checkedIn = bucket.present + bucket.late + bucket.veryLate;
    days.push({
      ...bucket,
      absent: Math.max(totalUsers - checkedIn, 0),
    });
  }

  const stats = days.reduce(
    (acc, day) => ({
      totalPresent: acc.totalPresent + day.present + day.late + day.veryLate,
      totalAbsent: acc.totalAbsent + day.absent,
      totalLate: acc.totalLate + day.late + day.veryLate,
      avgDelay: acc.avgDelay,
    }),
    { totalPresent: 0, totalAbsent: 0, totalLate: 0, avgDelay: 0 },
  );

  const delayed = records.filter((record) => allowedUserIds.has(record.userId?.toString?.()) && Number(record.delayMinutes) > 0);
  stats.avgDelay = delayed.length
    ? Math.round(delayed.reduce((sum, record) => sum + Number(record.delayMinutes || 0), 0) / delayed.length)
    : 0;

  res.json(new ApiResponse(200, { days, stats, month, year }, "Presence calendar retrieved"));
});

// Role: Recupere les donnees necessaires.
export const getPresenceByDate = asyncHandler(async (req, res) => {
  const { dateKey } = getDateRange(req.params.date);
  const scope = scopedFilter(req);
  const role = String(req.query.role || "");
  const statusFilter = String(req.query.status || "");
  const userFilter = {
    ...scope,
    isActive: true,
    role: role && role !== "all" ? role : { $in: ATTENDANCE_ROLES },
  };

  const [users, records] = await Promise.all([
    User.find(userFilter).select("name firstName lastName email role profileType tenantId").sort({ name: 1 }).lean(),
    Attendance.find({ ...scope, dateKey })
      .populate("userId", "name firstName lastName email role profileType")
      .lean(),
  ]);

  const byUserId = new Map(records.map((record) => [record.userId?._id?.toString?.() || record.userId?.toString?.(), record]));
  const rows = users.map((user) => {
    const record = byUserId.get(user._id.toString());
    if (record) {
      return serializePresence({
        ...record,
        userId: record.userId || user,
        userSnapshot: record.userSnapshot || buildUserSnapshot(user),
      });
    }

    return {
      _id: `absent-${user._id}-${dateKey}`,
      userId: user,
      userSnapshot: buildUserSnapshot(user),
      date: `${dateKey}T00:00:00.000Z`,
      dateKey,
      checkIn: null,
      checkOut: null,
      checkInTime: null,
      checkOutTime: null,
      status: "absent",
      delayMinutes: 0,
      reason: "",
    };
  }).filter((row) => !statusFilter || statusFilter === "all" || row.status === statusFilter);

  const stats = rows.reduce(
    (acc, row) => {
      if (row.status === "absent") acc.totalAbsent += 1;
      else acc.totalPresent += 1;
      if (row.status === "late" || row.status === "very_late") acc.totalLate += 1;
      acc.delaySum += Number(row.delayMinutes || 0);
      acc.delayCount += Number(row.delayMinutes || 0) > 0 ? 1 : 0;
      return acc;
    },
    { totalPresent: 0, totalAbsent: 0, totalLate: 0, delaySum: 0, delayCount: 0 },
  );

  res.json(new ApiResponse(200, {
    date: dateKey,
    records: rows,
    stats: {
      totalPresent: stats.totalPresent,
      totalAbsent: stats.totalAbsent,
      totalLate: stats.totalLate,
      avgDelay: stats.delayCount ? Math.round(stats.delaySum / stats.delayCount) : 0,
    },
  }, "Presence details retrieved"));
});

// Role: Verifie les donnees ou les droits.
export const checkIn = asyncHandler(async (req, res) => {
  const now = req.body.checkIn ? new Date(req.body.checkIn) : new Date();
  if (Number.isNaN(now.getTime())) throw new ApiError(400, "Invalid checkIn date");

  const dateKey = dateKeyFromDate(now);
  const date = new Date(`${dateKey}T00:00:00`);
  const expectedStartMinutes = parseExpectedStartMinutes(req.body.expectedStartTime);
  const delayMinutes = Math.max(0, minutesSinceMidnight(now) - expectedStartMinutes);
  const status = statusFromDelay(delayMinutes);

  if (["late", "very_late"].includes(status) && !String(req.body.reason || "").trim()) {
    throw new ApiError(400, "Reason is required for late check-in");
  }

  const userId = req.body.userId || req.user._id;
  const user = await User.findOne({ _id: userId, ...scopedFilter(req) });
  if (!user) throw new ApiError(404, "User not found");

  let attendance;
  try {
    attendance = await Attendance.create({
      userId,
      tenantId: req.tenantId || user.tenantId,
      date,
      dateKey,
      checkIn: now,
      status,
      delayMinutes,
      reason: String(req.body.reason || "").trim(),
      userSnapshot: buildUserSnapshot(user),
    });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "Presence already checked in for this date");
    throw error;
  }

  await attendance.populate("userId", "name firstName lastName email role profileType");
  await runPresenceRules(req, attendance);

  const payload = { attendance: serializePresence(attendance), date: dateKey };
  emitToUser(userId.toString(), "attendance_marked", payload);
  emitToRole("admin", "attendance_marked", payload);
  emitToTenant(req.tenantId || user.tenantId, "presence_calendar_updated", payload);

  res.status(201).json(new ApiResponse(201, { attendance: payload.attendance }, "Check-in recorded"));
});

export default {
  getPresenceCalendar,
  getPresenceByDate,
  checkIn,
};
