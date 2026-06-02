// Role du fichier: definit le modele MongoDB pour les traitements de paie.
import mongoose from "mongoose";

const payrollEmployeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    role: { type: String, trim: true, default: "employee" },
    baseSalary: { type: Number, min: 0, default: 0 },
    workedDays: { type: Number, min: 0, default: 0 },
    absentDays: { type: Number, min: 0, default: 0 },
    lateMinutes: { type: Number, min: 0, default: 0 },
    grossSalary: { type: Number, min: 0, default: 0 },
    cnss: { type: Number, min: 0, default: 0 },
    taxableSalary: { type: Number, min: 0, default: 0 },
    incomeTax: { type: Number, min: 0, default: 0 },
    deductions: { type: Number, min: 0, default: 0 },
    netSalary: { type: Number, min: 0, default: 0 },
    notes: { type: [String], default: [] },
  },
  { _id: false },
);

const payrollRunSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", index: true },
    period: { type: String, required: true, trim: true, match: /^\d{4}-\d{2}$/ },
    status: {
      type: String,
      enum: ["draft", "approved", "paid", "cancelled"],
      default: "draft",
      index: true,
    },
    currency: { type: String, default: "TND", trim: true },
    employees: { type: [payrollEmployeeSchema], default: [] },
    totals: {
      employeeCount: { type: Number, min: 0, default: 0 },
      grossSalary: { type: Number, min: 0, default: 0 },
      cnss: { type: Number, min: 0, default: 0 },
      incomeTax: { type: Number, min: 0, default: 0 },
      deductions: { type: Number, min: 0, default: 0 },
      netSalary: { type: Number, min: 0, default: 0 },
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "payrollRuns" },
);

payrollRunSchema.index({ tenantId: 1, period: 1 }, { unique: true });
payrollRunSchema.index({ period: -1, createdAt: -1 });

export default mongoose.model("PayrollRun", payrollRunSchema);
