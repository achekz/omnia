import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getTeamMembers = asyncHandler(async (req, res) => {
  if (!req.tenantId) {
    return res.json(new ApiResponse(200, []));
  }

  const members = await User.find({ tenantId: req.tenantId, isActive: true })
    .select('firstName lastName name email avatar role profileType isActive')
    .lean();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const team = await Promise.all(
    members.map(async (member) => {
      const logs = await ActivityLog.find({
        userId: member._id,
        date: { $gte: sevenDaysAgo },
      }).lean();

      const avgScore = logs.length
        ? Math.round(logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length)
        : 0;
      const tasksCompleted = logs.reduce((sum, log) => sum + (log.tasksCompleted || 0), 0);

      return {
        member,
        avgScore,
        tasksCompleted,
      };
    }),
  );

  return res.json(new ApiResponse(200, team));
});
