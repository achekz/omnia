// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import User from "../models/User.js";
import Task from "../models/Task.js";
import PerformanceLog from "../models/PerformanceLog.js";
import Recommendation from "../models/Recommendation.js";
import ActivityLog from "../models/ActivityLog.js";
import Attendance from "../models/Attendance.js";
import { fetchRecommendations, predictPerformance } from "./aiService.js";
import { saveRecommendation } from "./persistenceService.js";
import { normalizeRole } from "../utils/roleNormalization.js";

const WINDOW_DAYS = 6;

// Role: Construit la periode hebdomadaire analysee.
function getWeeklyWindow(referenceDate = new Date()) {
  const saturday = new Date(referenceDate);
  const daysSinceSaturday = (saturday.getDay() + 1) % 7;
  saturday.setDate(saturday.getDate() - daysSinceSaturday);
  saturday.setHours(10, 0, 0, 0);

  const windowEnd = new Date(saturday);
  const windowStart = new Date(saturday);
  windowStart.setDate(saturday.getDate() - 6);
  windowStart.setHours(0, 0, 0, 0);

  const year = saturday.getFullYear();
  const month = String(saturday.getMonth() + 1).padStart(2, "0");
  const date = String(saturday.getDate()).padStart(2, "0");

  return {
    windowStart,
    windowEnd,
    weekKey: `${year}-${month}-${date}`,
    saturday,
  };
}

// Role: Prepare une valeur pour l affichage ou l API.
function getUserName(user) {
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Compte";
}

// Role: Prepare une valeur pour l affichage ou l API.
function dateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Role: Construit les points du graphique hebdomadaire.
function buildAttendanceTrend(attendanceRecords, tasks, windowStart, windowEnd) {
  const recordsByDate = new Map(attendanceRecords.map((record) => [record.dateKey || dateKeyFromDate(new Date(record.date)), record]));
  const points = [];
  const cursor = new Date(windowStart);

  while (cursor <= windowEnd) {
    const dateKey = dateKeyFromDate(cursor);
    const record = recordsByDate.get(dateKey);
    const isLate = ["late", "very_late"].includes(record?.status);
    const isPresent = ["present", "on_time", "late", "very_late"].includes(record?.status);
    const next = new Date(cursor);
    next.setDate(cursor.getDate() + 1);
    const dayTasks = tasks.filter((task) => {
      const taskDate = task.completedAt || task.actualFinishedAt || task.declinedAt || task.updatedAt || task.createdAt;
      const value = taskDate ? new Date(taskDate) : null;
      return value && value >= cursor && value < next;
    });

    points.push({
      date: dateKey,
      day: String(cursor.getDate()).padStart(2, "0"),
      present: isPresent && !isLate ? 1 : 0,
      late: isLate ? 1 : 0,
      absent: record ? 0 : 1,
      tasksDone: dayTasks.filter((task) => task.status === "done").length,
      tasksLater: dayTasks.filter((task) => task.status === "declined").length,
      taskDelay: dayTasks.filter((task) => task.status === "overdue" || task.isDelayed || Number(task.delayDays || 0) > 0).length,
      status: record?.status || "absent",
      delayMinutes: Number(record?.delayMinutes || 0),
      reason: record?.reason || "",
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

// Role: Explique pourquoi le compte a ce score.
function buildEffectivenessReasons({ completedTasks, activeTasks, delayedTasks, laterTasks, presentDays, lateDays, completionRate, punctualityRate, avgActivityScore, score }) {
  const reasons = [];

  if (activeTasks > 0) {
    reasons.push(`${completedTasks}/${activeTasks} taches terminees (${completionRate}%).`);
  } else {
    reasons.push("Aucune tache active cette semaine, score base surtout sur presence et activite.");
  }

  if (delayedTasks > 0) {
    reasons.push(`${delayedTasks} tache(s) en retard ont reduit le score.`);
  } else {
    reasons.push("Aucune tache en retard detectee.");
  }

  if (laterTasks > 0) {
    reasons.push(`${laterTasks} tache(s) marquees Plus tard doivent etre renvoyees ou replannifiees.`);
  }

  if (presentDays > 0) {
    reasons.push(`${presentDays} seance(s) de presence, ponctualite ${punctualityRate}%.`);
  } else {
    reasons.push("Aucune seance de presence enregistree cette semaine.");
  }

  if (lateDays > 0) {
    reasons.push(`${lateDays} retard(s) de presence detecte(s).`);
  }

  reasons.push(`Score activite moyen: ${avgActivityScore}/100.`);

  if (score >= 75) {
    reasons.push("Compte considere efficace cette semaine grace a une execution stable.");
  } else if (score >= 50) {
    reasons.push("Compte moyennement efficace, quelques axes d amelioration existent.");
  } else {
    reasons.push("Compte a accompagner: efficacite hebdomadaire faible.");
  }

  return reasons;
}

// Role: Construit des donnees derivees.
function scoreUserEffectiveness({ user, tasks, activityLogs, attendanceRecords, windowStart, windowEnd }) {
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const activeTasks = tasks.filter((task) => ["todo", "in_progress", "overdue", "done"].includes(task.status)).length;
  const delayedTasks = tasks.filter((task) => task.status === "overdue" || task.isDelayed || Number(task.delayDays || 0) > 0).length;
  const laterTasks = tasks.filter((task) => task.status === "declined").length;
  const completionRate = activeTasks ? completedTasks / activeTasks : 0;
  const avgActivityScore = activityLogs.length
    ? activityLogs.reduce((sum, log) => sum + Number(log.score || 0), 0) / activityLogs.length
    : 0;
  const presentDays = attendanceRecords.filter((record) => ["present", "on_time", "late", "very_late"].includes(record.status)).length;
  const lateDays = attendanceRecords.filter((record) => ["late", "very_late"].includes(record.status)).length;
  const punctualityRate = presentDays ? Math.max(0, (presentDays - lateDays) / presentDays) : 0.5;
  const workloadBonus = Math.min(15, completedTasks * 3);
  const delayPenalty = Math.min(35, delayedTasks * 12);
  const score = Math.round(
    completionRate * 45 +
      punctualityRate * 25 +
      Math.min(100, avgActivityScore) * 0.2 +
      workloadBonus -
      delayPenalty,
  );
  const normalizedScore = Math.max(0, Math.min(100, score));
  const completionRatePct = Number((completionRate * 100).toFixed(1));
  const punctualityRatePct = Number((punctualityRate * 100).toFixed(1));
  const roundedActivityScore = Math.round(avgActivityScore);
  const trend = buildAttendanceTrend(attendanceRecords, tasks, windowStart, windowEnd);
  const reasons = buildEffectivenessReasons({
    completedTasks,
    activeTasks,
    delayedTasks,
    laterTasks,
    presentDays,
    lateDays,
    completionRate: completionRatePct,
    punctualityRate: punctualityRatePct,
    avgActivityScore: roundedActivityScore,
    score: normalizedScore,
  });

  return {
    userId: user._id,
    name: getUserName(user),
    email: user.email,
    role: normalizeRole(user.role, user.profileType || "employee"),
    score: normalizedScore,
    completedTasks,
    activeTasks,
    delayedTasks,
    presentDays,
    lateDays,
    absentDays: trend.filter((point) => point.absent > 0).length,
    tasksDone: completedTasks,
    tasksLater: laterTasks,
    taskDelay: delayedTasks,
    sessions: presentDays,
    avgActivityScore: roundedActivityScore,
    completionRate: completionRatePct,
    punctualityRate: punctualityRatePct,
    efficiencyLevel: normalizedScore >= 75 ? "high" : normalizedScore >= 50 ? "medium" : "low",
    reasons,
    trend,
    taskDetails: tasks.map((task) => ({
      id: task._id?.toString?.(),
      title: task.title,
      status: task.status,
      isDelayed: Boolean(task.isDelayed || task.status === "overdue"),
      completedAt: task.completedAt || task.actualFinishedAt || null,
      dueDate: task.dueDate || null,
    })),
  };
}

// Role: Recupere les donnees necessaires.
function getWindowStart() {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// Role: Construit des donnees derivees.
function buildScopeFilter({ tenantId, userIds }) {
  const filter = {};

  if (tenantId) {
    filter.tenantId = tenantId;
  }

  if (userIds?.length) {
    filter._id = { $in: userIds };
  }

  return filter;
}

// Role: Gere une etape d authentification.
export async function refreshRecommendationsForScope({ tenantId, userIds, trigger = "manual" } = {}) {
  const windowStart = getWindowStart();
  const windowEnd = new Date();
  const userFilter = buildScopeFilter({ tenantId, userIds });

  const users = await User.find(userFilter)
    .select("_id name email role profileType tenantId")
    .sort({ createdAt: -1 });

  const relevantUsers = users.filter((user) => normalizeRole(user.role, "employee") !== "admin");

  if (!relevantUsers.length) {
    return null;
  }

  const userIdsList = relevantUsers.map((user) => user._id);
  const taskFilter = {
    assignedTo: { $in: userIdsList },
    createdAt: { $gte: windowStart, $lte: windowEnd },
  };

  if (tenantId) {
    taskFilter.tenantId = tenantId;
  }

  const performanceFilter = {
    userId: { $in: userIdsList },
    date: { $gte: windowStart, $lte: windowEnd },
  };

  if (tenantId) {
    performanceFilter.tenantId = tenantId;
  }

  const [tasks, performanceLogs] = await Promise.all([
    Task.find(taskFilter).sort({ createdAt: -1 }),
    PerformanceLog.find(performanceFilter).sort({ date: -1 }),
  ]);

  const usersPayload = relevantUsers.map((user) => ({
    user,
    tasks: tasks.filter((task) => String(task.assignedTo) === String(user._id)),
    performanceLogs: performanceLogs.filter((entry) => String(entry.userId) === String(user._id)),
  }));

  const predictionResult = await predictPerformance({
    tenantId,
    windowDays: WINDOW_DAYS,
    users: usersPayload,
  });

  const predictions = predictionResult.predictions || [];
  const recommendationResult = await fetchRecommendations({
    tenantId,
    windowDays: WINDOW_DAYS,
    predictions,
  });

  const recommendation = await saveRecommendation({
    tenantId: tenantId || null,
    windowStart,
    windowEnd,
    generatedBy: trigger,
    summary: recommendationResult.summary || "AI recommendations generated.",
    recommendations: recommendationResult.recommendations || [],
    ranking: recommendationResult.bestEmployee?.ranking || null,
    score: recommendationResult.bestEmployee?.performanceScore || null,
    meta: {
      source: recommendationResult.source || predictionResult.source || "flask",
      bestEmployee: recommendationResult.bestEmployee || null,
      mostDisciplined: recommendationResult.mostDisciplined || null,
      delayedUsers: recommendationResult.delayedUsers || [],
      predictions,
      windowDays: WINDOW_DAYS,
    },
  });

  return recommendation;
}

// Role: Lance un traitement metier ou IA.
export async function generateWeeklyEffectivenessRecommendation({
  tenantId,
  trigger = "weekly-saturday-10",
  referenceDate = new Date(),
  force = false,
} = {}) {
  const { windowStart, windowEnd, weekKey, saturday } = getWeeklyWindow(referenceDate);
  const scopedTenant = tenantId || null;

  if (!force) {
    const existing = await Recommendation.findOne({
      tenantId: scopedTenant,
      kind: "weekly_effectiveness",
      weekKey,
    }).sort({ createdAt: -1 });

    if (existing) {
      return existing;
    }
  } else {
    await Recommendation.deleteMany({
      tenantId: scopedTenant,
      kind: "weekly_effectiveness",
      weekKey,
    });
  }

  const userFilter = {
    role: { $ne: "admin" },
    ...(scopedTenant ? { tenantId: scopedTenant } : {}),
    isActive: true,
  };

  const users = await User.find(userFilter)
    .select("_id name firstName lastName email role profileType tenantId")
    .sort({ role: 1, name: 1 });

  if (!users.length) {
    return saveRecommendation({
      tenantId: scopedTenant,
      kind: "weekly_effectiveness",
      weekKey,
      generatedBy: trigger,
      windowStart,
      windowEnd,
      summary: "Aucun compte actif a comparer cette semaine.",
      recommendations: ["Ajouter des comptes actifs pour generer une comparaison hebdomadaire."],
      ranking: null,
      score: null,
      meta: { userScores: [], source: "local-ml-effectiveness", weekKey },
    });
  }

  const userIds = users.map((user) => user._id);
  const baseScope = scopedTenant ? { tenantId: scopedTenant } : {};

  const [tasks, activityLogs, attendanceRecords] = await Promise.all([
    Task.find({
      ...baseScope,
      assignedTo: { $in: userIds },
      createdAt: { $gte: windowStart, $lte: windowEnd },
    }).lean(),
    ActivityLog.find({
      ...baseScope,
      userId: { $in: userIds },
      date: { $gte: windowStart, $lte: windowEnd },
    }).lean(),
    Attendance.find({
      ...baseScope,
      userId: { $in: userIds },
      date: { $gte: windowStart, $lte: windowEnd },
    }).lean(),
  ]);

  const userScores = users
    .map((user) =>
      scoreUserEffectiveness({
        user,
        tasks: tasks.filter((task) => String(task.assignedTo) === String(user._id)),
        activityLogs: activityLogs.filter((log) => String(log.userId) === String(user._id)),
        attendanceRecords: attendanceRecords.filter((record) => String(record.userId) === String(user._id)),
        windowStart,
        windowEnd,
      }),
    )
    .sort((a, b) => b.score - a.score);

  const best = userScores[0] || null;
  const delayedUsers = userScores.filter((entry) => entry.delayedTasks > 0);
  const weakUsers = userScores.filter((entry) => entry.score < 50);
  const averageScore = userScores.length
    ? Math.round(userScores.reduce((sum, entry) => sum + entry.score, 0) / userScores.length)
    : 0;

  const recommendations = [
    best
      ? `${best.name} est le compte le plus efficace cette semaine avec un score de ${best.score}/100.`
      : "Aucun meilleur compte detecte cette semaine.",
    delayedUsers.length
      ? `Suivre ${delayedUsers[0].name}: ${delayedUsers[0].delayedTasks} tache(s) en retard cette semaine.`
      : "Aucun retard critique detecte dans les taches cette semaine.",
    weakUsers.length
      ? `Prevoir un accompagnement pour ${weakUsers[0].name}, score hebdomadaire ${weakUsers[0].score}/100.`
      : "L efficacite globale de l equipe est stable cette semaine.",
  ];

  return saveRecommendation({
    tenantId: scopedTenant,
    kind: "weekly_effectiveness",
    weekKey,
    generatedBy: trigger,
    windowStart,
    windowEnd,
    summary: best
      ? `${best.name} est efficace cette semaine. Score moyen equipe: ${averageScore}/100.`
      : "Recommandation hebdomadaire generee sans donnees suffisantes.",
    recommendations,
    ranking: best ? 1 : null,
    score: best?.score ?? null,
    effectiveUser: best
      ? {
          userId: best.userId,
          name: best.name,
          email: best.email,
          role: best.role,
          score: best.score,
        }
      : undefined,
    meta: {
      source: "local-ml-effectiveness",
      weekKey,
      saturdayDate: saturday,
      averageScore,
      userScores,
      delayedUsers,
      generatedAtRule: "Chaque samedi a 10:00",
      chart: {
        labels: userScores[0]?.trend?.map((point) => point.day) || [],
        bestUserTrend: userScores[0]?.trend || [],
      },
    },
  });
}
