// Role du fichier: contient la logique backend des requetes et reponses API.
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Role: Recupere les donnees necessaires.
export const getDashboardStats = asyncHandler(async (req, res) => {
  const taskFilter = {};

  if (req.tenantId) {
    taskFilter.tenantId = req.tenantId;
  }

  if (['employee', 'stagiaire'].includes(req.user.role)) {
    taskFilter.assignedTo = req.user._id;

    if (req.user.role === 'employee') {
      const adminUsers = await User.find({ role: 'admin' }).select('_id').lean();
      taskFilter.createdBy = { $in: adminUsers.map((user) => user._id) };
    }
  }

  const [tasks, recentLogs, teamSize] = await Promise.all([
    Task.find(taskFilter).lean(),
    ActivityLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(7).lean(),
    req.tenantId ? User.countDocuments({ tenantId: req.tenantId, isActive: true }) : Promise.resolve(1),
  ]);

  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const overdueTasks = tasks.filter((task) => task.status === 'overdue').length;
  const activeProjects = new Set(tasks.flatMap((task) => task.tags || [])).size;
  const currentScore = recentLogs[0]?.score || 0;
  const streak = recentLogs.filter((log) => log.loginCount > 0 || log.tasksCompleted > 0).length;
  const weeklyActivity = [...recentLogs]
    .reverse()
    .map((log) => ({
      day: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: log.score || 0,
    }));

  return res.json(new ApiResponse(200, {
    teamSize,
    activeProjects,
    currentScore,
    anomaliesDetected: 0,
    completedTasks,
    overdueTasks,
    streak,
    weeklyActivity,
    byMonth: [],
  }));
});
