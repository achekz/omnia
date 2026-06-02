// Role du fichier: centralise les ecritures MongoDB critiques.
import Attendance from "../models/Attendance.js";
import Conversation from "../models/Conversation.js";
import EmailVerificationCode from "../models/EmailVerificationCode.js";
import InsightSnapshot from "../models/InsightSnapshot.js";
import MLPrediction from "../models/MLPrediction.js";
import Notification from "../models/Notification.js";
import PerformanceLog from "../models/PerformanceLog.js";
import Presence from "../models/Presence.js";
import Recommendation from "../models/Recommendation.js";
import RuleExecution from "../models/RuleExecution.js";
import Task from "../models/Task.js";

function dayStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function dateKeyFromDate(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getUserId(value) {
  return value?._id || value || null;
}

function clampScore(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export async function saveConversationMessage({ userId, tenantId, role, content, conversationId, attachments = [] }) {
  const saved = await Conversation.create({
    userId: userId || null,
    tenantId: tenantId || null,
    conversationId,
    role,
    content,
    attachments,
  });
  console.log("[DB] Conversation saved");
  return saved;
}

export async function saveNotification(payload) {
  const saved = await Notification.create(payload);
  console.log("[DB] Notification saved");
  return saved;
}

export async function savePrediction(payload) {
  const saved = await MLPrediction.create(payload);
  console.log("[DB] Prediction saved");
  return saved;
}

export async function saveRecommendation(payload) {
  const saved = await Recommendation.create(payload);
  console.log("[DB] Recommendation saved");
  return saved;
}

export async function saveInsightSnapshot(payload) {
  const saved = await InsightSnapshot.create(payload);
  console.log("[DB] InsightSnapshot saved");
  return saved;
}

export async function mirrorAttendanceToPresence(attendance, { logoutTime } = {}) {
  if (!attendance) return null;
  const raw = typeof attendance.toObject === "function" ? attendance.toObject() : attendance;
  const userId = getUserId(raw.userId);
  if (!userId || !raw.dateKey) return null;

  const saved = await Presence.findOneAndUpdate(
    { userId, dateKey: raw.dateKey },
    {
      $set: {
        userId,
        tenantId: raw.tenantId || null,
        date: raw.date || dayStart(raw.checkIn || raw.checkOut || logoutTime),
        dateKey: raw.dateKey,
        checkIn: raw.checkIn || null,
        checkOut: raw.checkOut || null,
        logoutTime: logoutTime || raw.logoutTime || null,
        status: raw.status === "on_time" ? "present" : raw.status,
        delayMinutes: Number(raw.delayMinutes || 0),
        reason: raw.reason || raw.checkOutReason || "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log("[DB] Presence saved");
  return saved;
}

export async function markLogoutPresence({ userId, tenantId, logoutTime = new Date() }) {
  if (!userId) return null;
  const date = dayStart(logoutTime);
  const dateKey = dateKeyFromDate(logoutTime);

  const attendance = await Attendance.findOneAndUpdate(
    { userId, dateKey },
    {
      $set: {
        userId,
        tenantId: tenantId || null,
        date,
        dateKey,
        logoutTime,
      },
      $setOnInsert: {
        status: "absent",
        delayMinutes: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await mirrorAttendanceToPresence(attendance, { logoutTime });
  return attendance;
}

export async function saveRuleExecution({ rule, context, matched, notifiedTargets = 0 }) {
  if (!rule?._id) return null;
  const saved = await RuleExecution.create({
    tenantId: context?.tenantId || rule.tenantId || null,
    ruleId: rule._id,
    ruleName: rule.name,
    resource: rule.resource,
    result: {
      matched: Boolean(matched),
      notifiedTargets,
      taskId: context?.task?._id?.toString?.() || null,
      recordId: context?.record?._id?.toString?.() || null,
      userId: context?.user?._id?.toString?.() || null,
    },
    triggeredAt: new Date(),
  });
  return saved;
}

export async function saveEmailVerificationAudit({ email, code, expiresAt, verified = false, purpose = "register", payload = {} }) {
  if (!email) return null;
  const role = payload.role || "employee";
  const saved = new EmailVerificationCode({
    email: String(email).trim().toLowerCase(),
    purpose,
    expiresAt,
    verifiedAt: verified ? new Date() : null,
    firstName: payload.firstName || "User",
    lastName: payload.lastName || "Account",
    role,
    gender: payload.gender || "male",
  });
  await saved.setCode(code);
  await saved.save();
  console.log("[DB] Email verification saved");
  return saved;
}

export async function markEmailVerificationVerified({ email, purpose = "register" }) {
  if (!email) return null;
  return EmailVerificationCode.updateMany(
    { email: String(email).trim().toLowerCase(), purpose, verifiedAt: null },
    { $set: { verifiedAt: new Date() } },
  );
}

export async function recordPerformance({ userId, tenantId, source = "system", riskScore } = {}) {
  if (!userId) return null;
  const date = dayStart();
  const monthStart = new Date(date);
  monthStart.setDate(1);

  const [tasks, attendanceRecords, latestPrediction] = await Promise.all([
    Task.find({ assignedTo: userId, ...(tenantId ? { tenantId } : {}) })
      .select("status isDelayed delayDays actualMinutes")
      .lean(),
    Attendance.find({ userId, ...(tenantId ? { tenantId } : {}), date: { $gte: monthStart, $lte: new Date() } })
      .select("status")
      .lean(),
    riskScore === undefined
      ? MLPrediction.findOne({ userId, ...(tenantId ? { tenantId } : {}) }).sort({ createdAt: -1 }).select("riskScore").lean()
      : null,
  ]);

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const delayedTasks = tasks.filter((task) => task.status === "overdue" || task.isDelayed || Number(task.delayDays || 0) > 0).length;
  const presentDays = attendanceRecords.filter((record) => ["present", "on_time", "late", "very_late"].includes(record.status)).length;
  const attendanceRate = attendanceRecords.length ? Math.round((presentDays / attendanceRecords.length) * 100) : 0;
  const completionRate = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const delayPenalty = tasks.length ? (delayedTasks / tasks.length) * 35 : 0;
  const normalizedRisk = Number(riskScore ?? latestPrediction?.riskScore ?? 0);
  const productivityScore = clampScore(completionRate * 0.7 + attendanceRate * 0.3 - delayPenalty - normalizedRisk * 15);
  const executionMinutes = tasks.reduce((sum, task) => sum + Number(task.actualMinutes || 0), 0);

  const saved = await PerformanceLog.findOneAndUpdate(
    { userId, date },
    {
      $set: {
        userId,
        tenantId: tenantId || null,
        date,
        productivityScore,
        score: productivityScore,
        completedTasks,
        delayedTasks,
        attendanceRate,
        riskScore: normalizedRisk,
        executionMinutes,
        source,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log("[DB] Performance saved");
  return saved;
}
