import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/analytics/activity
export const getActivity = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await ActivityLog.find({
    userId: req.user._id,
    date: { $gte: thirtyDaysAgo },
  }).sort({ date: 1 });

  const formatted = logs.map(l => ({
    date: l.date.toISOString().split('T')[0],
    score: l.score,
    tasksCompleted: l.tasksCompleted,
    activeMinutes: l.activeMinutes,
    studyHours: l.studyHours,
  }));

  return res.json(new ApiResponse(200, { activity: formatted }));
});

// GET /api/analytics/score
export const getScore = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(14);
  const current = logs[0]?.score || 0;
  const lastWeek = logs.slice(7, 14);
  const thisWeek = logs.slice(0, 7);
  const avgThis = thisWeek.reduce((a, l) => a + l.score, 0) / (thisWeek.length || 1);
  const avgLast = lastWeek.reduce((a, l) => a + l.score, 0) / (lastWeek.length || 1);
  const trend = avgLast === 0 ? 'stable' : avgThis > avgLast ? 'up' : avgThis < avgLast ? 'down' : 'stable';
  const trendPct = avgLast > 0 ? Math.abs(((avgThis - avgLast) / avgLast) * 100).toFixed(1) : 0;

  return res.json(new ApiResponse(200, { current, trend, trendPct, history: logs.slice(0, 7).reverse() }));
});

// GET /api/analytics/team
export const getTeamAnalytics = asyncHandler(async (req, res) => {
  if (!req.tenantId) return res.json(new ApiResponse(200, { team: [] }));

  const members = await User.find({ tenantId: req.tenantId }).select('name email avatar role profileType');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const team = await Promise.all(members.map(async (m) => {
    const logs = await ActivityLog.find({ userId: m._id, date: { $gte: sevenDaysAgo } });
    const avgScore = logs.length ? Math.round(logs.reduce((a, l) => a + l.score, 0) / logs.length) : 0;
    const tasksCompleted = logs.reduce((a, l) => a + l.tasksCompleted, 0);
    const lastActive = logs.length ? logs.sort((a, b) => b.date - a.date)[0].date : null;
    return { member: m, avgScore, tasksCompleted, lastActive };
  }));

  return res.json(new ApiResponse(200, { team }));
});

// POST /api/analytics/log
export const logActivity = asyncHandler(async (req, res) => {
  const { tasksCompleted, activeMinutes, loginEvent, studyHours, budgetSpent } = req.body;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const update = { $setOnInsert: { tenantId: req.tenantId } };
  if (tasksCompleted) update.$inc = { ...(update.$inc || {}), tasksCompleted };
  if (activeMinutes) update.$inc = { ...(update.$inc || {}), activeMinutes };
  if (loginEvent) update.$inc = { ...(update.$inc || {}), loginCount: 1 };
  if (studyHours !== undefined) update.$set = { studyHours };
  if (budgetSpent !== undefined) update.$set = { ...update.$set, budgetSpent };

  const log = await ActivityLog.findOneAndUpdate(
    { userId: req.user._id, date: today },
    update,
    { upsert: true, new: true }
  );

  return res.json(new ApiResponse(200, { log }));
});
