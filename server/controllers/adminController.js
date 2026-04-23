import User from '../models/User.js';
import Organization from '../models/Organization.js';
import ActivityLog from '../models/ActivityLog.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { withTenantFilter } from '../middleware/tenantMiddleware.js';

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;

  // Admin dashboard stats
  const [usersCount, tenantsCount, activeUsers, recentActivity] = await Promise.all([
    User.countDocuments({ tenantId, isActive: true }),
    Organization.countDocuments({ _id: tenantId }),
    User.countDocuments({ tenantId, isActive: true, lastLogin: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }),
    ActivityLog.find({ tenantId }).sort({ createdAt: -1 }).limit(10)
  ]);

  const dashboardData = {
    stats: {
      totalUsers: usersCount,
      activeUsers,
      tenants: tenantsCount,
      recentActivity: recentActivity.length
    },
    recentUsers: await User.find({ tenantId }).sort({ createdAt: -1 }).limit(5).select('-password'),
    aiInsights: 'AI usage analytics here'
  };

  res.json(new ApiResponse(200, dashboardData, 'Admin dashboard loaded'));
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  
  const users = await User.find({ tenantId })
    .select('-password -refreshToken')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { users }, 'Users retrieved'));
});

export const getAllTenants = asyncHandler(async (req, res) => {
  const tenants = await Organization.find({}).select('name type ownerId members plan');
  res.json(new ApiResponse(200, { tenants }, 'Tenants retrieved'));
});

export const toggleUserActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.tenantId;

  const user = await User.findOne({ _id: id, tenantId });
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, 'User not found'));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json(new ApiResponse(200, { user: user.select('-password') }, 'User status updated'));
});

export const deleteTenant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Soft delete tenant
  await Organization.findByIdAndUpdate(id, { isActive: false });
  await User.updateMany({ tenantId: id }, { isActive: false });

  res.json(new ApiResponse(200, {}, 'Tenant deactivated'));
});

export const getSystemAnalytics = asyncHandler(async (req, res) => {
  // System-wide analytics (ADMIN only, bypass tenant for global stats)
  const analytics = {
    totalUsers: await User.countDocuments(),
    activeSessions: 'Real-time from Redis',
    aiQueries: 'AI usage stats',
    revenue: 'Subscription analytics'
  };

  res.json(new ApiResponse(200, analytics, 'System analytics'));
});

export const getAIInsights = asyncHandler(async (req, res) => {
  // AI system insights for admin
  res.json(new ApiResponse(200, {
    ragStatus: '751 chunks indexed',
    modelUsage: 'GPT-4o-mini',
    queryPerformance: 'Avg 1.2s response'
  }, 'AI insights'));
};

export default {
  getAdminDashboard,
  getAllUsers,
  getAllTenants,
  toggleUserActive,
  deleteTenant,
  getSystemAnalytics,
  getAIInsights
};
