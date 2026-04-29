import ActivityLog from '../models/ActivityLog.js';
import MLPrediction from '../models/MLPrediction.js';
import * as notifService from '../services/notifService.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { predictPerformance } from '../services/aiService.js';
import { refreshRecommendationsForScope } from '../services/recommendationService.js';
import Recommendation from '../models/Recommendation.js';
import * as mlService from '../services/mlService.js';

function normalizeRiskScore(score) {
  const numericScore = Number(score || 0);
  if (!Number.isFinite(numericScore)) return 0;
  return numericScore > 1 ? Math.max(0, Math.min(1, numericScore / 100)) : Math.max(0, Math.min(1, numericScore));
}

// POST /api/ml/predict
export const predict = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await ActivityLog.find({ userId: req.user._id, date: { $gte: sevenDaysAgo } });

  const features = {
    tasks_completed_last_7d: logs.reduce((a, l) => a + l.tasksCompleted, 0),
    avg_daily_active_minutes: logs.length ? logs.reduce((a, l) => a + l.activeMinutes, 0) / logs.length : 0,
    deadlines_missed_last_30d: logs.reduce((a, l) => a + l.overdueCount, 0),
    login_frequency: logs.filter(l => l.loginCount > 0).length,
    overdue_count: logs.reduce((a, l) => a + l.overdueCount, 0),
  };

  const mlPrediction = await mlService.predict(features);
  const fallbackResult = await predictPerformance({
    users: [{ user: req.user, tasks: [], performanceLogs: logs }],
    features,
  });
  const fallbackPrediction = fallbackResult.predictions?.[0] || fallbackResult;
  const riskScore = normalizeRiskScore(mlPrediction.risk_score ?? fallbackPrediction.risk_score ?? fallbackPrediction.performanceScore);
  const prediction = {
    ...fallbackPrediction,
    ...mlPrediction,
    risk_score: riskScore,
    risk_level: mlPrediction.risk_level || (riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low'),
  };

  const saved = await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.tenantId,
    modelType: 'prediction',
    input: features,
    output: prediction,
    riskLevel: prediction.risk_level,
    riskScore,
    confidence: prediction.confidence,
  });

  if (prediction.risk_level === 'high') {
    await notifService.create(req.user._id, req.tenantId, {
      type: 'warning',
      title: '🤖 High Risk Detected',
      message: `ML model detected high risk (score: ${riskScore.toFixed(2)}). Check your activity.`,
      source: 'ml',
    });
  }

  return res.json(new ApiResponse(200, { prediction: saved, riskScore }));
});

// POST /api/ml/recommend
export const recommend = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await ActivityLog.find({ userId: req.user._id, date: { $gte: sevenDaysAgo } });
  const latestScore = logs.length ? logs.sort((a, b) => b.date - a.date)[0].score : 50;
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

  return res.json(new ApiResponse(200, { recommendations: savedRecommendation?.recommendations || [], raw: savedRecommendation, context }));
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
    values = records.map((record) => record.amount).reverse();
  }
  if (!Array.isArray(values)) throw new ApiError(400, 'values array required');

  const result = await mlService.detectAnomaly(values);

  const saved = await MLPrediction.create({
    userId: req.user._id,
    tenantId: req.tenantId,
    modelType: 'anomaly',
    input: { values },
    output: result,
    isAnomaly: result.is_anomaly,
    riskScore: result.anomaly_score,
  });

  if (result.is_anomaly) {
    await notifService.create(req.user._id, req.tenantId, {
      type: 'danger',
      title: '🚨 Anomaly Detected',
      message: `Unusual financial pattern detected (score: ${result.anomaly_score?.toFixed(2)}).`,
      source: 'ml',
      actionUrl: '/finance',
    });
  }

  return res.json(new ApiResponse(200, { anomaly: saved }));
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
  const [latestPrediction, latestRecommendation, anomalies] = await Promise.all([
    MLPrediction.findOne({ userId: req.user._id, modelType: 'prediction' }).sort({ createdAt: -1 }),
    MLPrediction.findOne({ userId: req.user._id, modelType: 'recommendation' }).sort({ createdAt: -1 }),
    MLPrediction.find({ userId: req.user._id, modelType: 'anomaly', isAnomaly: true })
      .sort({ createdAt: -1 }).limit(5),
  ]);
  return res.json(new ApiResponse(200, { latestPrediction, latestRecommendation, anomalies }));
});

export const recommendations = asyncHandler(async (req, res) => {
  const scopeFilter = req.tenantId ? { tenantId: req.tenantId } : {};
  const records = await Recommendation.find(scopeFilter).sort({ createdAt: -1 }).limit(10);
  return res.json(new ApiResponse(200, { records }));
});
