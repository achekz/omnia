// Role du fichier: contient la logique backend des requetes et reponses API.
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import ActivityLog from '../models/ActivityLog.js';
import Attendance from '../models/Attendance.js';
import FinancialRecord from '../models/FinancialRecord.js';
import MLPrediction from '../models/MLPrediction.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Presence from '../models/Presence.js';
import PerformanceLog from '../models/PerformanceLog.js';
import Recommendation from '../models/Recommendation.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeRole } from '../utils/roleNormalization.js';
import * as mlService from '../services/mlService.js';
import * as notifService from '../services/notifService.js';
import { ruleEngine } from '../services/ruleEngine.js';
import { generateWeeklyEffectivenessRecommendation, refreshRecommendationsForScope } from '../services/recommendationService.js';

// Role: Construit des donnees derivees.
function buildScopeFilter(req) {
  return req.user?.tenantId ? { tenantId: req.user.tenantId } : {};
}

// Role: Prepare une valeur pour l affichage ou l API.
function normalizeRoleFilter(role) {
  const normalized = String(role || '').trim();
  return normalized ? normalizeRole(normalized, "") : null;
}

// Role: Prepare une valeur pour l affichage ou l API.
function serializeAttendanceRecord(record) {
  const raw = typeof record.toObject === 'function' ? record.toObject() : record;
  const populatedUser = raw.userId && typeof raw.userId === 'object' ? raw.userId : null;
  const snapshot = raw.userSnapshot || {};

  return {
    ...raw,
    userId: populatedUser || {
      name: snapshot.name,
      firstName: snapshot.firstName,
      lastName: snapshot.lastName,
      email: snapshot.email,
      role: snapshot.role,
      profileType: snapshot.profileType,
    },
  };
}

// Role: Decrit la logique riskLevelFromScore.
function riskLevelFromScore(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

// Role: Construit des donnees derivees.
function buildTaskRiskFeatures(tasks, logs) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter((log) => new Date(log.date) >= sevenDaysAgo);

  return {
    tasks_completed_last_7d: recentLogs.reduce((sum, log) => sum + (log.tasksCompleted || 0), 0),
    avg_daily_active_minutes: recentLogs.length
      ? recentLogs.reduce((sum, log) => sum + (log.activeMinutes || 0), 0) / recentLogs.length
      : 0,
    deadlines_missed_last_30d: tasks.filter((task) => task.status === 'overdue' || task.isDelayed).length,
    login_frequency: recentLogs.filter((log) => (log.loginCount || 0) > 0).length,
    overdue_count: tasks.filter((task) => task.status === 'overdue' || task.isDelayed).length,
  };
}

// Role: Construit des donnees derivees.
async function buildAdminAiMetrics(scopeFilter) {
  const alertFilter = {
    ...scopeFilter,
    $or: [
      { source: { $in: ['ml', 'rule_engine'] } },
      { type: { $in: ['warning', 'danger', 'ml'] } },
    ],
  };

  const [alertsTriggered, anomaliesDetected, latestPredictions] = await Promise.all([
    Notification.countDocuments(alertFilter),
    MLPrediction.countDocuments({ ...scopeFilter, modelType: 'anomaly', isAnomaly: true }),
    MLPrediction.find({ ...scopeFilter, modelType: 'prediction' })
      .sort({ createdAt: -1 })
      .limit(500)
      .select('userId riskLevel riskScore createdAt'),
  ]);

  const latestByUser = new Map();
  for (const prediction of latestPredictions) {
    const userId = prediction.userId?.toString?.();
    if (userId && !latestByUser.has(userId)) {
      latestByUser.set(userId, prediction);
    }
  }

  const riskDistribution = { low: 0, medium: 0, high: 0 };
  for (const prediction of latestByUser.values()) {
    const level = prediction.riskLevel || riskLevelFromScore(prediction.riskScore || 0);
    riskDistribution[level] += 1;
  }

  return {
    alertsTriggered,
    anomaliesDetected,
    riskDistribution,
    riskUsers: [...latestByUser.values()]
      .filter((prediction) => (prediction.riskLevel || riskLevelFromScore(prediction.riskScore || 0)) !== 'low')
      .map((prediction) => ({
        userId: prediction.userId,
        riskLevel: prediction.riskLevel || riskLevelFromScore(prediction.riskScore || 0),
        riskScore: prediction.riskScore || 0,
      })),
  };
}

// Role: Recupere les donnees necessaires.
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeSessionSince = new Date(Date.now() - 30 * 60 * 1000);

  const [
    users,
    tasks,
    presenceRecords,
    performanceLogs,
    recommendations,
    organizations,
    recentActivity,
    totalUsers,
    activeUsers,
    totalTasks,
    completedTasks,
    activeSessions,
    aiMetrics,
  ] = await Promise.all([
    User.find(scopeFilter).select('-password -refreshToken').sort({ createdAt: -1 }).limit(50),
    Task.find(scopeFilter)
      .populate('assignedTo', 'name email role profileType')
      .populate('createdBy', 'name email role profileType')
      .sort({ createdAt: -1 })
      .limit(100),
    Presence.find(scopeFilter).sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
    PerformanceLog.find(scopeFilter).sort({ date: -1 }).limit(20).populate('userId', 'name email'),
    Recommendation.find(scopeFilter).sort({ createdAt: -1 }).limit(10),
    Organization.find(req.user?.tenantId ? { _id: req.user.tenantId } : {}).select('name type ownerId members plan'),
    ActivityLog.find(scopeFilter).sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
    User.countDocuments(scopeFilter),
    User.countDocuments({ ...scopeFilter, isActive: true }),
    Task.countDocuments(scopeFilter),
    Task.countDocuments({ ...scopeFilter, status: 'done' }),
    User.countDocuments({ ...scopeFilter, lastLogin: { $gte: activeSessionSince } }),
    buildAdminAiMetrics(scopeFilter),
  ]);

  const delayedTasks = tasks.filter((task) => task.status === 'overdue').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const pendingTasks = tasks.filter((task) => task.status === 'todo').length;
  const recentUsers = users.slice(0, 5);
  const averageScore =
    performanceLogs.length > 0
      ? Math.round(performanceLogs.reduce((sum, entry) => sum + (entry.score || 0), 0) / performanceLogs.length)
      : 0;
  const latestRecommendation = recommendations[0] || null;

  const stats = {
    totalUsers,
    activeUsers,
    activeSessions,
    tenants: organizations.length,
    totalTasks,
    completedTasks,
    delayedTasks,
    inProgressTasks,
    pendingTasks,
    alertsTriggered: aiMetrics.alertsTriggered,
    anomaliesDetected: aiMetrics.anomaliesDetected,
    presenceCount: presenceRecords.length,
    recommendationCount: recommendations.length,
    performanceScore: averageScore,
    weeklyLogins: await ActivityLog.countDocuments({
      ...scopeFilter,
      date: { $gte: sevenDaysAgo },
      loginCount: { $gt: 0 },
    }),
  };

  res.json(
    new ApiResponse(
      200,
      {
        stats,
        recentUsers,
        users,
        tasks,
        presenceRecords,
        performanceLogs,
        recommendations,
        aiSummary: latestRecommendation?.meta || null,
        aiMetrics,
        tenants: organizations,
        recentActivity,
      },
      'Admin dashboard loaded',
    ),
  );
});

// Role: Lance un traitement metier ou IA.
export const detectGlobalAnomalies = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);

  const [records, tasks, inactiveUsers] = await Promise.all([
    FinancialRecord.find(scopeFilter).sort({ date: -1 }).limit(100).select('amount'),
    Task.find(scopeFilter).sort({ createdAt: -1 }).limit(200).select('status priority delayDays priorityScore'),
    User.countDocuments({ ...scopeFilter, isActive: false }),
  ]);

  const values = records.length
    ? records.map((record) => record.amount).reverse()
    : [
        tasks.filter((task) => task.status === 'overdue').length,
        tasks.filter((task) => task.priority === 'high' || task.priority === 'critical').length,
        inactiveUsers,
        tasks.reduce((sum, task) => sum + (task.delayDays || 0), 0),
      ];

  const result = await mlService.detectAnomaly(values);
  const fallbackScore = Math.min(1, (values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(1, values.length)) / 100);
  const anomalyScore = Number(result.anomaly_score ?? result.score ?? fallbackScore);
  const isAnomaly = Boolean(result.is_anomaly || anomalyScore >= 0.65);

  const saved = await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.user?.tenantId || req.tenantId || null,
    modelType: 'anomaly',
    input: { values, scope: records.length ? 'finance' : 'system' },
    output: { ...result, anomaly_score: anomalyScore, source: result.fallback ? 'local-fallback' : 'ml-service' },
    isAnomaly,
    riskScore: anomalyScore,
  });

  if (isAnomaly) {
    await notifService.create(req.user._id, req.user?.tenantId || req.tenantId, {
      type: 'danger',
      title: 'Global anomaly detected',
      message: `OmniAI detected a global anomaly score of ${anomalyScore.toFixed(2)}.`,
      source: 'ml',
      actionUrl: '/admin/dashboard',
      metadata: { predictionId: saved._id.toString(), scope: records.length ? 'finance' : 'system' },
    });
  }

  res.json(new ApiResponse(200, { anomaly: saved, isAnomaly, anomalyScore }, 'Global anomaly detection executed'));
});

// Role: Decrit la logique monitorUserRisks.
export const monitorUserRisks = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const users = await User.find({ ...scopeFilter, role: { $ne: 'admin' } }).select('_id name email role profileType tenantId isActive');
  const userIds = users.map((user) => user._id);

  const [tasks, logs] = await Promise.all([
    Task.find({ ...scopeFilter, assignedTo: { $in: userIds } }),
    ActivityLog.find({ ...scopeFilter, userId: { $in: userIds } }).sort({ date: -1 }).limit(1000),
  ]);

  const predictions = [];
  for (const user of users) {
    const userTasks = tasks.filter((task) => String(task.assignedTo) === String(user._id));
    const userLogs = logs.filter((log) => String(log.userId) === String(user._id));
    const features = buildTaskRiskFeatures(userTasks, userLogs);
    const mlPrediction = await mlService.predict(features);
    const riskScore = Number(mlPrediction.risk_score ?? mlPrediction.risk ?? 0);
    const riskLevel = mlPrediction.risk_level || riskLevelFromScore(riskScore);

    const saved = await MLPrediction.create({
      userId: user._id,
      tenantId: user.tenantId || req.tenantId || null,
      modelType: 'prediction',
      input: features,
      output: mlPrediction,
      riskLevel,
      riskScore,
      confidence: mlPrediction.confidence || 0.75,
    });

    if (riskLevel === 'high') {
      await notifService.create(req.user._id, req.user?.tenantId || req.tenantId, {
        type: 'warning',
        title: 'High-risk user detected',
        message: `${user.name || user.email} is currently high risk.`,
        source: 'ml',
        actionUrl: '/admin/users',
        metadata: { userId: user._id.toString(), predictionId: saved._id.toString() },
      });
    }

    predictions.push(saved);
  }

  res.json(new ApiResponse(200, {
    usersEvaluated: users.length,
    highRiskUsers: predictions.filter((prediction) => prediction.riskLevel === 'high').length,
    predictions,
  }, 'User risk monitoring executed'));
});

// Role: Lance un traitement metier ou IA.
export const optimizeSystemRules = asyncHandler(async (req, res) => {
  const [ruleResult, recommendation] = await Promise.all([
    ruleEngine.run({ trigger: 'manual', tenantId: req.tenantId }),
    refreshRecommendationsForScope({
      tenantId: req.user?.tenantId || req.tenantId,
      trigger: 'admin-system-optimization',
    }),
  ]);

  res.json(new ApiResponse(200, {
    ...ruleResult,
    recommendation,
  }, 'System rules optimized'));
});

// Role: Recupere l historique des recommandations hebdomadaires.
export const getWeeklyRecommendations = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const limit = Math.min(52, Math.max(1, Number(req.query.limit || 20)));
  const records = await Recommendation.find({
    ...scopeFilter,
    kind: 'weekly_effectiveness',
  })
    .sort({ weekKey: -1, windowEnd: -1, createdAt: -1 })
    .limit(limit);

  res.json(new ApiResponse(200, { records }, 'Weekly recommendations retrieved'));
});

// Role: Genere manuellement la recommandation hebdomadaire.
export const generateWeeklyRecommendation = asyncHandler(async (req, res) => {
  const recommendation = await generateWeeklyEffectivenessRecommendation({
    tenantId: req.user?.tenantId || req.tenantId,
    trigger: 'admin-manual-weekly',
    force: Boolean(req.body?.force),
  });

  res.status(201).json(new ApiResponse(201, { recommendation }, 'Weekly recommendation generated'));
});

// Role: Recupere les donnees necessaires.
export const getAllUsers = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const role = normalizeRoleFilter(req.query.role);
  const filter = role ? { ...scopeFilter, role } : { ...scopeFilter, role: { $ne: 'admin' } };

  const users = await User.find(filter)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { users }, 'Users retrieved'));
});

// Role: Recupere les donnees necessaires.
export const getUserTaskDetails = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const user = await User.findOne({ _id: req.params.id, ...scopeFilter, role: { $ne: 'admin' } })
    .select('-password -refreshToken');

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  const tasks = await Task.find({ ...scopeFilter, assignedTo: user._id })
    .populate('assignedTo', 'name firstName lastName email role profileType')
    .populate('createdBy', 'name firstName lastName email role profileType')
    .populate('completedBy', 'name firstName lastName email role profileType')
    .populate('comments.userId', 'name firstName lastName email role profileType')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { user, tasks }, 'User task details retrieved'));
});

// Role: Supprime ou reinitialise des donnees.
export const deleteUserAccount = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const user = await User.findOne({ _id: req.params.id, ...scopeFilter }).select('_id role tenantId email');

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  if (normalizeRole(user.role, 'employee') === 'admin') {
    throw new ApiError(400, 'Admin account cannot be deleted');
  }

  const userId = user._id;

  const [tasks, attendance, activityLogs, performanceLogs, mlPredictions, notifications] = await Promise.all([
    Task.deleteMany({ ...scopeFilter, $or: [{ assignedTo: userId }, { createdBy: userId }, { completedBy: userId }] }),
    Attendance.deleteMany({ ...scopeFilter, userId }),
    ActivityLog.deleteMany({ ...scopeFilter, userId }),
    PerformanceLog.deleteMany({ ...scopeFilter, userId }),
    MLPrediction.deleteMany({ ...scopeFilter, userId }),
    Notification.deleteMany({ ...scopeFilter, userId }),
  ]);

  await user.deleteOne();

  res.json(new ApiResponse(200, {
    deletedUserId: userId,
    deleted: {
      tasks: tasks.deletedCount || 0,
      attendance: attendance.deletedCount || 0,
      activityLogs: activityLogs.deletedCount || 0,
      performanceLogs: performanceLogs.deletedCount || 0,
      mlPredictions: mlPredictions.deletedCount || 0,
      notifications: notifications.deletedCount || 0,
    },
  }, 'User account deleted'));
});

// Role: Recupere les donnees necessaires.
export const getAllPresences = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);

  const records = await Attendance.find(scopeFilter)
    .populate('userId', 'name firstName lastName email role profileType')
    .sort({ date: -1, checkIn: 1 })
    .limit(500);

  res.json(new ApiResponse(200, { records: records.map(serializeAttendanceRecord) }, 'Presences retrieved'));
});

// Role: Recupere les donnees necessaires.
export const getAllTasks = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);

  const tasks = await Task.find(scopeFilter)
    .populate('assignedTo', 'name firstName lastName email role profileType')
    .populate('createdBy', 'name firstName lastName email role profileType')
    .populate('comments.userId', 'name firstName lastName email role profileType')
    .sort({ createdAt: -1 })
    .limit(500);

  res.json(new ApiResponse(200, { tasks }, 'Tasks retrieved'));
});

// Role: Recupere les donnees necessaires.
export const getAllTenants = asyncHandler(async (req, res) => {
  const tenants = await Organization.find({}).select('name type ownerId members plan');
  res.json(new ApiResponse(200, { tenants }, 'Tenants retrieved'));
});

// Role: Controle l etat de l interface.
export const toggleUserActive = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const user = await User.findOne({ _id: req.params.id, ...scopeFilter }).select('-password -refreshToken');

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json(new ApiResponse(200, { user }, 'User status updated'));
});

// Role: Supprime ou reinitialise des donnees.
export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Organization.findByIdAndUpdate(id, { isActive: false });
  await User.updateMany({ tenantId: id }, { isActive: false });

  res.json(new ApiResponse(200, {}, 'Tenant deactivated'));
});

// Role: Recupere les donnees necessaires.
export const getSystemAnalytics = asyncHandler(async (req, res) => {
  const [totalUsers, totalTasks, totalRecommendations, totalPresence] = await Promise.all([
    User.countDocuments(),
    Task.countDocuments(),
    Recommendation.countDocuments(),
    Presence.countDocuments(),
  ]);

  res.json(
    new ApiResponse(
      200,
      {
        totalUsers,
        totalTasks,
        totalRecommendations,
        totalPresence,
        modelUsage: process.env.XAI_MODEL || 'grok-4',
      },
      'System analytics',
    ),
  );
});

// Role: Recupere les donnees necessaires.
export const getAIInsights = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const latestRecommendation = await Recommendation.findOne(scopeFilter).sort({ createdAt: -1 });

  res.json(
    new ApiResponse(
      200,
      {
        provider: 'xAI Grok',
        modelUsage: process.env.XAI_MODEL || 'grok-4',
        latestRecommendation,
      },
      'AI insights',
    ),
  );
});

export default {
  getAdminDashboard,
  getAllUsers,
  getUserTaskDetails,
  deleteUserAccount,
  getAllPresences,
  getAllTasks,
  getAllTenants,
  toggleUserActive,
  deleteTenant,
  getSystemAnalytics,
  getAIInsights,
  detectGlobalAnomalies,
  monitorUserRisks,
  optimizeSystemRules,
  getWeeklyRecommendations,
  generateWeeklyRecommendation,
};
