// Role du fichier: recupere le contexte MongoDB utile pour l assistant IA RAG.
import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog.js";
import Attendance from "../models/Attendance.js";
import Notification from "../models/Notification.js";
import PerformanceLog from "../models/PerformanceLog.js";
import Recommendation from "../models/Recommendation.js";
import Rule from "../models/Rule.js";
import Task from "../models/Task.js";
import { normalizeRole } from "../utils/roleNormalization.js";

const ADMIN_ROLES = new Set(["admin", "company_admin", "cabinet_admin", "manager"]);
const MAX_TASKS = 30;
const MAX_NOTIFICATIONS = 12;
const MAX_LOGS = 14;
const MAX_RULES = 10;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function compactUser(user) {
  if (!user) return null;
  return {
    id: user._id?.toString?.(),
    name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    email: user.email,
    role: normalizeRole(user.role || user.profileType, "employee"),
    tenantId: user.tenantId?.toString?.() || null,
  };
}

function compactTask(task) {
  return {
    id: task._id?.toString?.(),
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    priorityScore: task.priorityScore,
    progress: task.progress,
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo._id?.toString?.() || task.assignedTo?.toString?.(),
          name: task.assignedTo.name || `${task.assignedTo.firstName || ""} ${task.assignedTo.lastName || ""}`.trim() || task.assignedTo.email,
          email: task.assignedTo.email,
          role: task.assignedTo.role,
        }
      : null,
    createdBy: task.createdBy
      ? {
          id: task.createdBy._id?.toString?.() || task.createdBy?.toString?.(),
          name: task.createdBy.name || `${task.createdBy.firstName || ""} ${task.createdBy.lastName || ""}`.trim() || task.createdBy.email,
          email: task.createdBy.email,
          role: task.createdBy.role,
        }
      : null,
    dueDate: task.dueDate,
    startTime: task.startTime || task.plannedStartAt,
    completedAt: task.completedAt || task.actualFinishedAt,
    delayDays: task.delayDays || 0,
    isDelayed: Boolean(task.isDelayed),
    aiRecommendation: task.aiRecommendation?.recommendation || null,
  };
}

function compactNotification(notification) {
  return {
    id: notification._id?.toString?.(),
    type: notification.type,
    title: notification.title,
    message: notification.message || "",
    isRead: notification.isRead,
    source: notification.source,
    actionUrl: notification.actionUrl || notification.redirectTarget,
    createdAt: notification.createdAt,
    metadata: notification.metadata || {},
  };
}

function compactAttendance(record) {
  return {
    id: record._id?.toString?.(),
    date: record.date,
    dateKey: record.dateKey,
    status: record.status,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    delayMinutes: record.delayMinutes || 0,
    reason: record.reason || "",
  };
}

function compactLog(log) {
  return {
    id: log._id?.toString?.(),
    date: log.date,
    tasksCompleted: log.tasksCompleted ?? log.completedTasks ?? 0,
    tasksCreated: log.tasksCreated ?? 0,
    completedTasks: log.completedTasks ?? log.tasksCompleted ?? 0,
    delayedTasks: log.delayedTasks ?? log.overdueCount ?? 0,
    activeMinutes: log.activeMinutes ?? log.executionMinutes ?? 0,
    score: log.score ?? 0,
  };
}

function calculateTaskSummary(tasks) {
  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const pending = tasks.filter((task) => ["todo", "in_progress"].includes(task.status)).length;
  const overdue = tasks.filter((task) => task.status === "overdue" || task.isDelayed || (task.dueDate && task.dueDate < now && task.status !== "done")).length;
  const dueToday = tasks.filter((task) => task.dueDate && task.dueDate >= todayStart && task.dueDate <= todayEnd && task.status !== "done").length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    overdue,
    dueToday,
    completionRate,
  };
}

function buildTaskFilter(user, role) {
  const tenantFilter = user.tenantId ? { tenantId: user.tenantId } : {};
  if (ADMIN_ROLES.has(role)) {
    return tenantFilter;
  }

  return {
    ...tenantFilter,
    assignedTo: user._id,
  };
}

function buildRuleFilter(user, role) {
  const filter = { isActive: true };
  if (user.tenantId) {
    filter.$or = [{ tenantId: user.tenantId }, { tenantId: { $exists: false } }, { tenantId: null }];
  }
  if (!ADMIN_ROLES.has(role)) {
    filter.$and = [
      {
        $or: [
          { roles: { $size: 0 } },
          { roles: role },
          { roles: { $exists: false } },
        ],
      },
    ];
  }
  return filter;
}

export async function retrieveRagContext({ user, question }) {
  if (!user) {
    return {
      hasAuthenticatedUser: false,
      noContextReason: "No authenticated user was attached to the request.",
      question,
      generatedAt: new Date().toISOString(),
    };
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected; RAG context cannot be retrieved.");
  }

  const role = normalizeRole(user.role || user.profileType, "employee");
  const taskFilter = buildTaskFilter(user, role);
  const since = daysAgo(30);

  const [
    tasks,
    notifications,
    attendance,
    activityLogs,
    performanceLogs,
    recommendations,
    rules,
  ] = await Promise.all([
    Task.find(taskFilter)
      .populate("assignedTo", "name firstName lastName email role profileType")
      .populate("createdBy", "name firstName lastName email role profileType")
      .sort({ status: 1, priorityScore: -1, dueDate: 1, createdAt: -1 })
      .limit(MAX_TASKS),
    Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(MAX_NOTIFICATIONS),
    Attendance.find({ userId: user._id, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(MAX_LOGS),
    ActivityLog.find({ userId: user._id, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(MAX_LOGS),
    PerformanceLog.find({ userId: user._id, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(MAX_LOGS),
    Recommendation.find({
      $or: [
        { generatedFor: user._id },
        ...(user.tenantId ? [{ tenantId: user.tenantId }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5),
    Rule.find(buildRuleFilter(user, role))
      .sort({ updatedAt: -1 })
      .limit(MAX_RULES),
  ]);

  const compactTasks = tasks.map(compactTask);
  const taskSummary = calculateTaskSummary(tasks);

  return {
    hasAuthenticatedUser: true,
    generatedAt: new Date().toISOString(),
    question,
    user: compactUser(user),
    scope: ADMIN_ROLES.has(role) ? "tenant_or_global_admin_scope" : "current_user_scope",
    taskSummary,
    tasks: compactTasks,
    pendingTasks: compactTasks.filter((task) => ["todo", "in_progress"].includes(task.status)),
    overdueTasks: compactTasks.filter((task) => task.status === "overdue" || task.isDelayed || Number(task.delayDays || 0) > 0),
    recentNotifications: notifications.map(compactNotification),
    recentAttendance: attendance.map(compactAttendance),
    recentActivity: activityLogs.map(compactLog),
    recentPerformance: performanceLogs.map(compactLog),
    recommendations: recommendations.map((recommendation) => ({
      id: recommendation._id?.toString?.(),
      kind: recommendation.kind,
      summary: recommendation.summary,
      recommendations: recommendation.recommendations || [],
      score: recommendation.score,
      createdAt: recommendation.createdAt,
    })),
    activeRules: rules.map((rule) => ({
      id: rule._id?.toString?.(),
      name: rule.name,
      trigger: rule.trigger,
      resource: rule.resource,
      description: rule.description || "",
      conditions: rule.conditions || [],
      action: rule.action || null,
    })),
    emptyCollections: {
      tasks: tasks.length === 0,
      notifications: notifications.length === 0,
      attendance: attendance.length === 0,
      activity: activityLogs.length === 0 && performanceLogs.length === 0,
      recommendations: recommendations.length === 0,
      rules: rules.length === 0,
    },
  };
}
