import User from '../models/User.js';
import Organization from '../models/Organization.js';
import ActivityLog from '../models/ActivityLog.js';
import Task from '../models/Task.js';
import Presence from '../models/Presence.js';
import PerformanceLog from '../models/PerformanceLog.js';
import Recommendation from '../models/Recommendation.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function buildScopeFilter(req) {
  return req.user?.tenantId ? { tenantId: req.user.tenantId } : {};
}

function normalizeRoleFilter(role) {
  const normalized = String(role || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 'comptable') {
    return 'accountant';
  }

  if (normalized === 'stagiaire') {
    return 'intern';
  }

  return normalized;
}

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, tasks, presenceRecords, performanceLogs, recommendations, organizations, recentActivity] = await Promise.all([
    User.find(scopeFilter).select('-password -refreshToken').sort({ createdAt: -1 }).limit(12),
    Task.find(scopeFilter)
      .populate('assignedTo', 'name email role profileType')
      .populate('createdBy', 'name email role profileType')
      .sort({ createdAt: -1 })
      .limit(20),
    Presence.find(scopeFilter).sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
    PerformanceLog.find(scopeFilter).sort({ date: -1 }).limit(20).populate('userId', 'name email'),
    Recommendation.find(scopeFilter).sort({ createdAt: -1 }).limit(10),
    Organization.find(req.user?.tenantId ? { _id: req.user.tenantId } : {}).select('name type ownerId members plan'),
    ActivityLog.find(scopeFilter).sort({ createdAt: -1 }).limit(10).populate('userId', 'name email'),
  ]);

  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const delayedTasks = tasks.filter((task) => task.status === 'overdue').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const pendingTasks = tasks.filter((task) => task.status === 'todo').length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const recentUsers = users.slice(0, 5);
  const averageScore =
    performanceLogs.length > 0
      ? Math.round(performanceLogs.reduce((sum, entry) => sum + (entry.score || 0), 0) / performanceLogs.length)
      : 0;

  const stats = {
    totalUsers: users.length,
    activeUsers,
    tenants: organizations.length,
    totalTasks: tasks.length,
    completedTasks,
    delayedTasks,
    inProgressTasks,
    pendingTasks,
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
        tenants: organizations,
        recentActivity,
      },
      'Admin dashboard loaded',
    ),
  );
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const scopeFilter = buildScopeFilter(req);
  const role = normalizeRoleFilter(req.query.role);
  const filter = role ? { ...scopeFilter, role } : scopeFilter;

  const users = await User.find(filter)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { users }, 'Users retrieved'));
});

export const getAllTenants = asyncHandler(async (req, res) => {
  const tenants = await Organization.find({}).select('name type ownerId members plan');
  res.json(new ApiResponse(200, { tenants }, 'Tenants retrieved'));
});

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

export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Organization.findByIdAndUpdate(id, { isActive: false });
  await User.updateMany({ tenantId: id }, { isActive: false });

  res.json(new ApiResponse(200, {}, 'Tenant deactivated'));
});

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
  getAllTenants,
  toggleUserActive,
  deleteTenant,
  getSystemAnalytics,
  getAIInsights,
};
