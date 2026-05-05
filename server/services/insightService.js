import ActivityLog from "../models/ActivityLog.js";
import Attendance from "../models/Attendance.js";
import FinancialRecord from "../models/FinancialRecord.js";
import InsightSnapshot from "../models/InsightSnapshot.js";
import Recommendation from "../models/Recommendation.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { refreshRecommendationsForScope } from "./recommendationService.js";

const WINDOW_DAYS = 30;

function scopeFilter(tenantId) {
  return tenantId ? { tenantId } : {};
}

function pct(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function kpi({ key, label, value, unit = "", trend = "stable", status = "neutral", description = "" }) {
  return { key, label, value, unit, trend, status, description };
}

function analysis({ severity = "info", title, message, metric = "" }) {
  return { severity, title, message, metric };
}

function recommendation({ title, message, priority = "medium", source = "system" }) {
  return { title, message, priority, source };
}

function getStatusFromThreshold(value, warning, critical, inverse = false) {
  if (inverse) {
    if (value <= critical) return "critical";
    if (value <= warning) return "warning";
    return "good";
  }

  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "good";
}

export async function generateInsightSnapshot({ tenantId, generatedBy = "system", role = "all" } = {}) {
  const windowEnd = new Date();
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const scoped = scopeFilter(tenantId);

  const [users, tasks, attendance, activityLogs, financeRecords, latestRecommendation] = await Promise.all([
    User.find({ ...scoped, isActive: true }).select("_id role profileType").lean(),
    Task.find({ ...scoped, createdAt: { $gte: windowStart, $lte: windowEnd } }).lean(),
    Attendance.find({ ...scoped, date: { $gte: windowStart, $lte: windowEnd } }).lean(),
    ActivityLog.find({ ...scoped, date: { $gte: windowStart, $lte: windowEnd } }).lean(),
    FinancialRecord.find({ ...scoped, date: { $gte: windowStart, $lte: windowEnd } }).lean(),
    Recommendation.findOne(scoped).sort({ createdAt: -1 }).lean(),
  ]);

  let generatedRecommendation = latestRecommendation;
  if (!generatedRecommendation) {
    generatedRecommendation = await refreshRecommendationsForScope({ tenantId, trigger: "insight-snapshot" });
  }

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const overdueTasks = tasks.filter((task) => task.status === "overdue" || (task.delayDays || 0) > 0).length;
  const openTasks = tasks.filter((task) => ["todo", "in_progress", "overdue"].includes(task.status)).length;
  const completionRate = pct(completedTasks, tasks.length);
  const attendancePresent = attendance.filter((entry) => ["present", "on_time", "late", "very_late"].includes(entry.status)).length;
  const attendanceLate = attendance.filter((entry) => ["late", "very_late"].includes(entry.status)).length;
  const attendanceRate = pct(attendancePresent, Math.max(attendance.length, users.length));
  const avgDelay = attendanceLate
    ? Math.round(attendance.filter((entry) => Number(entry.delayMinutes) > 0).reduce((sum, entry) => sum + Number(entry.delayMinutes || 0), 0) / attendanceLate)
    : 0;
  const avgActivityScore = activityLogs.length
    ? Math.round(activityLogs.reduce((sum, log) => sum + Number(log.score || 0), 0) / activityLogs.length)
    : 0;
  const income = financeRecords.filter((record) => record.type === "income").reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const expenses = financeRecords.filter((record) => record.type === "expense").reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const anomalyCount = financeRecords.filter((record) => record.isAnomaly).length;

  const kpis = [
    kpi({
      key: "task_completion_rate",
      label: "Task completion",
      value: completionRate,
      unit: "%",
      status: getStatusFromThreshold(completionRate, 55, 35, true),
      description: `${completedTasks}/${tasks.length || 0} tasks completed in ${WINDOW_DAYS} days.`,
    }),
    kpi({
      key: "open_tasks",
      label: "Open tasks",
      value: openTasks,
      status: getStatusFromThreshold(openTasks, 8, 15),
      description: "Todo, in-progress and overdue workload.",
    }),
    kpi({
      key: "overdue_tasks",
      label: "Overdue tasks",
      value: overdueTasks,
      status: getStatusFromThreshold(overdueTasks, 2, 5),
      description: "Delayed execution detected by the system.",
    }),
    kpi({
      key: "attendance_rate",
      label: "Attendance rate",
      value: attendanceRate,
      unit: "%",
      status: getStatusFromThreshold(attendanceRate, 75, 55, true),
      description: "Present, late and very late records versus expected activity.",
    }),
    kpi({
      key: "avg_delay_minutes",
      label: "Average delay",
      value: avgDelay,
      unit: "min",
      status: getStatusFromThreshold(avgDelay, 15, 45),
      description: "Average delay among late arrivals.",
    }),
    kpi({
      key: "activity_score",
      label: "Activity score",
      value: avgActivityScore,
      unit: "/100",
      status: getStatusFromThreshold(avgActivityScore, 60, 40, true),
      description: "Average score from activity logs.",
    }),
    kpi({
      key: "net_balance",
      label: "Net balance",
      value: income - expenses,
      unit: "TND",
      status: income - expenses >= 0 ? "good" : "warning",
      description: "Income minus expenses for the analysis window.",
    }),
    kpi({
      key: "finance_anomalies",
      label: "Finance anomalies",
      value: anomalyCount,
      status: getStatusFromThreshold(anomalyCount, 1, 3),
      description: "Records flagged as financial anomalies.",
    }),
  ];

  const analysisItems = [];
  if (completionRate < 55) {
    analysisItems.push(analysis({
      severity: "warning",
      title: "Task completion is below target",
      message: `Only ${completionRate}% of tasks were completed. The system recommends focusing on overdue and high-priority work first.`,
      metric: "task_completion_rate",
    }));
  }
  if (overdueTasks > 0) {
    analysisItems.push(analysis({
      severity: overdueTasks >= 5 ? "critical" : "warning",
      title: "Delayed workload detected",
      message: `${overdueTasks} task(s) are overdue or delayed. This can reduce team performance and trigger alerts.`,
      metric: "overdue_tasks",
    }));
  }
  if (avgDelay >= 15) {
    analysisItems.push(analysis({
      severity: avgDelay >= 45 ? "critical" : "warning",
      title: "Attendance delay pattern",
      message: `Average late arrival is ${avgDelay} minutes. Managers should review recurring lateness signals.`,
      metric: "avg_delay_minutes",
    }));
  }
  if (anomalyCount > 0) {
    analysisItems.push(analysis({
      severity: anomalyCount >= 3 ? "critical" : "warning",
      title: "Financial anomaly signals",
      message: `${anomalyCount} financial record(s) were flagged as anomalous by the system.`,
      metric: "finance_anomalies",
    }));
  }
  if (!analysisItems.length) {
    analysisItems.push(analysis({
      title: "System signals are stable",
      message: "No critical anomaly or performance risk was detected for the current analysis window.",
      metric: "overall",
    }));
  }

  const recommendations = [
    overdueTasks
      ? recommendation({
          title: "Prioritize delayed execution",
          message: "Start with overdue high-priority tasks and reduce open workload before assigning new work.",
          priority: overdueTasks >= 5 ? "high" : "medium",
        })
      : recommendation({
          title: "Maintain execution cadence",
          message: "No major task delay is visible. Keep the current delivery rhythm and monitor priority changes.",
          priority: "low",
        }),
    avgDelay >= 15
      ? recommendation({
          title: "Send attendance alerts",
          message: "Enable manager alerts for repeated lateness and review schedule flexibility where needed.",
          priority: avgDelay >= 45 ? "high" : "medium",
        })
      : recommendation({
          title: "Keep attendance monitoring active",
          message: "Attendance delay is under control. Continue live check-in monitoring.",
          priority: "low",
        }),
    anomalyCount
      ? recommendation({
          title: "Review flagged finance records",
          message: "Comptable should consult anomaly results and supporting records, while AI keeps detecting anomalies automatically.",
          priority: anomalyCount >= 3 ? "high" : "medium",
        })
      : recommendation({
          title: "No finance anomaly follow-up required",
          message: "Financial entries are stable in this window.",
          priority: "low",
        }),
    ...(generatedRecommendation?.recommendations || []).slice(0, 3).map((item) =>
      recommendation({
        title: "AI recommendation",
        message: item,
        priority: "medium",
        source: "recommendation-engine",
      }),
    ),
  ];

  const summary = `AI analyzed ${users.length} user(s), ${tasks.length} task(s), ${attendance.length} attendance record(s), and ${financeRecords.length} finance record(s) for the last ${WINDOW_DAYS} days.`;

  return InsightSnapshot.create({
    tenantId: tenantId || null,
    generatedBy,
    generatedForRole: role,
    windowStart,
    windowEnd,
    kpis,
    analysis: analysisItems,
    recommendations,
    summary,
    meta: {
      userCount: users.length,
      taskCount: tasks.length,
      attendanceCount: attendance.length,
      financeRecordCount: financeRecords.length,
      sourceRecommendationId: generatedRecommendation?._id?.toString?.() || null,
    },
  });
}

export async function getLatestInsightSnapshot({ tenantId } = {}) {
  const scoped = scopeFilter(tenantId);
  const latest = await InsightSnapshot.findOne(scoped).sort({ createdAt: -1 });

  if (latest) {
    return latest;
  }

  return generateInsightSnapshot({ tenantId, generatedBy: "auto-initial" });
}
