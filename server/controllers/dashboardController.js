import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import FinancialRecord from '../models/FinancialRecord.js';
import User from '../models/User.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const taskFilter = {};

  if (req.tenantId) {
    taskFilter.tenantId = req.tenantId;
  }

  if (['employee', 'student'].includes(req.user.role)) {
    taskFilter.assignedTo = req.user._id;
  }

  const [tasks, recentLogs, teamSize, financeRecords] = await Promise.all([
    Task.find(taskFilter).lean(),
    ActivityLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(7).lean(),
    req.tenantId ? User.countDocuments({ tenantId: req.tenantId, isActive: true }) : Promise.resolve(1),
    req.tenantId ? FinancialRecord.find({ tenantId: req.tenantId }).lean() : Promise.resolve([]),
  ]);

  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const overdueTasks = tasks.filter((task) => task.status === 'overdue').length;
  const activeProjects = new Set(tasks.flatMap((task) => task.tags || [])).size;
  const currentScore = recentLogs[0]?.score || 0;
  const streak = recentLogs.filter((log) => log.loginCount > 0 || log.tasksCompleted > 0).length;
  const anomalyCount = financeRecords.filter((record) => record.isAnomaly).length;
  const balance = financeRecords.reduce((sum, record) => {
    return sum + (record.type === 'income' ? record.amount : -record.amount);
  }, 0);

  const weeklyActivity = [...recentLogs]
    .reverse()
    .map((log) => ({
      day: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: log.score || 0,
    }));

  const monthlyMap = {};
  financeRecords.forEach((record) => {
    const month = new Date(record.date).toLocaleDateString('en-US', { month: 'short' });
    if (!monthlyMap[month]) {
      monthlyMap[month] = { month, income: 0, expense: 0 };
    }

    if (record.type === 'income') {
      monthlyMap[month].income += record.amount;
    } else {
      monthlyMap[month].expense += record.amount;
    }
  });

  return res.json(new ApiResponse(200, {
    teamSize,
    activeProjects,
    currentScore,
    anomaliesDetected: anomalyCount,
    completedTasks,
    overdueTasks,
    streak,
    balance,
    anomalyCount,
    weeklyActivity,
    byMonth: Object.values(monthlyMap).slice(-6),
  }));
});
