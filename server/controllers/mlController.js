import ActivityLog from '../models/ActivityLog.js';
import MLPrediction from '../models/MLPrediction.js';
import * as notifService from '../services/notifService.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { refreshRecommendationsForScope } from '../services/recommendationService.js';
import Recommendation from '../models/Recommendation.js';
import * as mlService from '../services/mlService.js';
import Attendance from '../models/Attendance.js';

function normalizeRiskScore(score) {
  const numericScore = Number(score || 0);
  if (!Number.isFinite(numericScore)) return 0;
  return numericScore > 1
    ? Math.max(0, Math.min(1, numericScore / 100))
    : Math.max(0, Math.min(1, numericScore));
}

function throwIfMlUnavailable(error) {
  if (error?.code === 'ML_SERVICE_UNAVAILABLE') {
    throw new ApiError(503, 'ML service is unavailable. ML predictions are disabled until the real ML service is online.');
  }
  throw error;
}

// POST /api/ml/predict
export const predict = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs = await ActivityLog.find({
    userId: req.user._id,
    date: { $gte: sevenDaysAgo },
  });

  const features = {
    tasks_completed_last_7d: logs.reduce((a, l) => a + (l.tasksCompleted || 0), 0),
    avg_daily_active_minutes: logs.length
      ? logs.reduce((a, l) => a + (l.activeMinutes || 0), 0) / logs.length
      : 0,
    deadlines_missed_last_30d: logs.reduce((a, l) => a + (l.overdueCount || 0), 0),
    login_frequency: logs.filter((l) => (l.loginCount || 0) > 0).length,
    overdue_count: logs.reduce((a, l) => a + (l.overdueCount || 0), 0),
  };

  let mlPrediction;
  try {
    mlPrediction = await mlService.predict(features);
  } catch (error) {
    throwIfMlUnavailable(error);
  }

  const riskScore = normalizeRiskScore(
    mlPrediction.risk ?? mlPrediction.risk_score ?? 0
  );

  const prediction = {
    ...mlPrediction,
    risk_score: riskScore,
    risk_level:
      mlPrediction.risk_level ||
      (riskScore >= 0.7
        ? 'high'
        : riskScore >= 0.4
        ? 'medium'
        : 'low'),
  };

  const saved = await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.tenantId,
    modelType: 'prediction',
    input: features,
    output: prediction,
    riskLevel: prediction.risk_level,
    riskScore,
    confidence: prediction.confidence || 0.7,
  });

  if (prediction.risk_level === 'high') {
    await notifService.create(req.user._id, req.tenantId, {
      type: 'warning',
      title: '🤖 High Risk Detected',
      message: `ML model detected high risk (score: ${riskScore.toFixed(2)}).`,
      source: 'ml',
    });
  }

  return res.json(new ApiResponse(200, { prediction: saved, riskScore }));
});

// POST /api/ml/recommend
export const recommend = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs = await ActivityLog.find({
    userId: req.user._id,
    date: { $gte: sevenDaysAgo },
  });

  const latestScore = logs.length
    ? logs.sort((a, b) => b.date - a.date)[0].score
    : 50;

  const pendingTasks = await (await import('../models/Task.js')).default.countDocuments({
    assignedTo: req.user._id,
    status: { $in: ['todo', 'in_progress'] },
  });

  const context = {
    profileType: req.user.profileType,
    role: req.user.role,
    time_of_day: new Date().getHours(),
    pending_tasks_count: pendingTasks,
    recent_score: latestScore,
    day_of_week: new Date().getDay(),
  };

  const savedRecommendation = await refreshRecommendationsForScope({
    tenantId: req.tenantId,
    userIds: [req.user._id],
    trigger: 'manual-ml-route',
  });

  await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.tenantId,
    modelType: 'recommendation',
    input: context,
    output: savedRecommendation,
    recommendations: savedRecommendation?.recommendations || [],
  });

  return res.json(
    new ApiResponse(200, {
      recommendations: savedRecommendation?.recommendations || [],
      raw: savedRecommendation,
      context,
    })
  );
});

// POST /api/ml/anomaly
export const anomaly = asyncHandler(async (req, res) => {
  let { values } = req.body;

  if (!values) {
    const records = await (await import('../models/FinancialRecord.js')).default
      .find(req.tenantId ? { tenantId: req.tenantId } : {})
      .sort({ date: -1 })
      .limit(100)
      .select('amount');

    values = records.map((r) => r.amount).reverse();
  }

  if (!Array.isArray(values)) {
    throw new ApiError(400, 'values array required');
  }

  let result;
  try {
    result = await mlService.detectAnomaly(values);
  } catch (error) {
    throwIfMlUnavailable(error);
  }

  const saved = await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.tenantId,
    modelType: 'anomaly',
    input: { values },
    output: result,
    isAnomaly: result.is_anomaly,
    riskScore: result.anomaly_score || 0,
  });

  if (result.is_anomaly) {
    await notifService.create(req.user._id, req.tenantId, {
      type: 'danger',
      title: '🚨 Anomaly Detected',
      message: `Score: ${(result.anomaly_score || 0).toFixed(2)}`,
      source: 'ml',
      actionUrl: '/finance',
    });
  }

  return res.json(new ApiResponse(200, { anomaly: saved }));
});

export const predictDelay = asyncHandler(async (req, res) => {
  const userId = req.body?.userId || req.user._id;
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const records = await Attendance.find({
    userId,
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
    date: { $gte: since },
  }).sort({ date: 1 }).lean();

  const delays = records.map((record) => Number(record.delayMinutes || 0));
  const features = {
    past_delays: delays,
    avg_delay: delays.length ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length : 0,
    late_count: records.filter((record) => ['late', 'very_late'].includes(record.status)).length,
    absence_count: Math.max(0, 60 - records.length),
    day_of_week: new Date().getDay(),
  };

  let result;
  try {
    result = await mlService.predictDelay(features);
  } catch (error) {
    throwIfMlUnavailable(error);
  }

  const riskScore = normalizeRiskScore(result.risk_score ?? result.riskScore ?? result.risk ?? 0);
  const saved = await MLPrediction.create({
    userId,
    tenantId: req.tenantId,
    modelType: 'presence_delay',
    input: features,
    output: result,
    riskLevel: riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low',
    riskScore,
    confidence: result.confidence || 0.75,
  });

  return res.json(new ApiResponse(200, { prediction: saved, riskScore, result }));
});

export const presenceAnomaly = asyncHandler(async (req, res) => {
  const userId = req.body?.userId || req.user._id;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const records = await Attendance.find({
    userId,
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
    date: { $gte: since },
  }).sort({ date: 1 }).lean();

  const features = {
    delays: records.map((record) => Number(record.delayMinutes || 0)),
    statuses: records.map((record) => record.status === 'on_time' ? 'present' : record.status),
    dates: records.map((record) => record.dateKey),
  };

  let result;
  try {
    result = await mlService.detectPresenceAnomaly(features);
  } catch (error) {
    throwIfMlUnavailable(error);
  }

  const saved = await MLPrediction.create({
    userId,
    tenantId: req.tenantId,
    modelType: 'presence_anomaly',
    input: features,
    output: result,
    isAnomaly: Boolean(result.is_anomaly ?? result.isAnomaly),
    riskScore: normalizeRiskScore(result.anomaly_score ?? result.score ?? 0),
  });

  return res.json(new ApiResponse(200, { anomaly: saved, result }));
});

// GET /api/ml/history
export const history = asyncHandler(async (req, res) => {
  const records = await MLPrediction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  return res.json(new ApiResponse(200, { records }));
});

// GET /api/ml/insights
export const insights = asyncHandler(async (req, res) => {
  const [latestPrediction, latestRecommendation, anomalies] =
    await Promise.all([
      MLPrediction.findOne({
        userId: req.user._id,
        modelType: 'prediction',
      }).sort({ createdAt: -1 }),

      MLPrediction.findOne({
        userId: req.user._id,
        modelType: 'recommendation',
      }).sort({ createdAt: -1 }),

      MLPrediction.find({
        userId: req.user._id,
        modelType: 'anomaly',
        isAnomaly: true,
      })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

  return res.json(
    new ApiResponse(200, {
      latestPrediction,
      latestRecommendation,
      anomalies,
    })
  );
});

export const recommendations = asyncHandler(async (req, res) => {
  const scopeFilter = req.tenantId ? { tenantId: req.tenantId } : {};

  const records = await Recommendation.find(scopeFilter)
    .sort({ createdAt: -1 })
    .limit(10);

  return res.json(new ApiResponse(200, { records }));
});
