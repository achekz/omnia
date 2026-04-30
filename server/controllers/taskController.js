import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateScore } from '../services/scoreService.js';
import { emitToRole, emitToUser } from '../config/socket.js';
import * as notifService from '../services/notifService.js';
import { isEmployeeLikeRole, normalizeRole } from '../utils/roleNormalization.js';
import { refreshRecommendationsForScope } from '../services/recommendationService.js';

const ASSIGNABLE_ROLES = ['employee', 'stagiaire', 'comptable'];
const ADMIN_ROLES = ['company_admin', 'cabinet_admin', 'manager', 'admin'];
const TASK_STATUSES = ['todo', 'in_progress', 'done', 'overdue', 'declined'];

function getDisplayName(user) {
  if (!user) return 'User';
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
}

async function populateTask(task) {
  return task.populate([
    { path: 'assignedTo', select: 'name firstName lastName email avatar role profileType' },
    { path: 'createdBy', select: 'name firstName lastName email avatar role profileType' },
    { path: 'completedBy', select: 'name firstName lastName email avatar role profileType' },
  ]);
}

// GET /api/tasks
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.tenantId) filter.tenantId = req.tenantId;
  if (isEmployeeLikeRole(req.user.role)) {
    filter.assignedTo = req.user._id;
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo && !isEmployeeLikeRole(req.user.role)) {
    filter.assignedTo = assignedTo;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name firstName lastName email avatar role profileType')
      .populate('createdBy', 'name firstName lastName email avatar role profileType')
      .populate('completedBy', 'name firstName lastName email avatar role profileType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { tasks, total, page: parseInt(page), limit: parseInt(limit) }));
});

// POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority,
    dueDate,
    assignedTo,
    tags,
    estimatedMinutes,
    estimatedDuration,
    estimatedDurationMinutes,
    startTime,
  } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  const normalizedEstimatedMinutes = Number(estimatedMinutes || estimatedDurationMinutes || estimatedDuration || 0) || undefined;
  const normalizedStartTime = startTime ? new Date(startTime) : undefined;
  const normalizedDueDate = dueDate ? new Date(dueDate) : undefined;

  const taskData = {
    title,
    description,
    priority: priority || 'medium',
    dueDate: normalizedDueDate,
    tags: tags || [],
    estimatedMinutes: normalizedEstimatedMinutes,
    estimatedDurationMinutes: normalizedEstimatedMinutes,
    plannedStartAt: normalizedStartTime,
    startTime: normalizedStartTime,
    createdBy: req.user._id,
    tenantId: req.tenantId,
  };

  if (isEmployeeLikeRole(req.user.role)) {
    taskData.assignedTo = req.user._id;
  } else {
    if (!assignedTo) {
      throw new ApiError(400, 'Assigned user is required');
    }

    const assignedUserFilter = { _id: assignedTo, role: { $in: ASSIGNABLE_ROLES } };
    if (req.tenantId) assignedUserFilter.tenantId = req.tenantId;

    const assignedUser = await User.findOne(assignedUserFilter).select('_id');
    if (!assignedUser) {
      throw new ApiError(400, 'Task can only be assigned to an employee, stagiaire, or comptable');
    }

    taskData.assignedTo = assignedUser._id;
  }

  const task = await Task.create(taskData);
  await populateTask(task);

  // Log task creation
  const today = new Date(); today.setHours(0,0,0,0);
  await ActivityLog.findOneAndUpdate(
    { userId: req.user._id, date: today },
    { $inc: { tasksCreated: 1 }, $setOnInsert: { tenantId: req.tenantId } },
    { upsert: true }
  );

  // Notify assigned user via socket if different from creator
  if (task.assignedTo && task.assignedTo._id.toString() !== req.user._id.toString()) {
    emitToUser(task.assignedTo._id.toString(), 'task_created', { task });
    emitToUser(task.assignedTo._id.toString(), 'taskCreated', { task });
    await notifService.create(task.assignedTo._id, req.tenantId, {
      type: 'info',
      title: 'New task assigned',
      message: `A new task "${task.title}" was assigned to you. Confirm it or choose Plus tard.`,
      source: 'user',
      actionUrl: '/tasks',
      metadata: { taskId: task._id.toString(), taskTitle: task.title, taskStatus: 'todo', actionRequired: true },
    });
  }

  emitToRole('admin', 'task_created', { task });
  emitToRole('admin', 'taskCreated', { task });

  void refreshRecommendationsForScope({
    tenantId: req.tenantId || undefined,
    userIds: [task.assignedTo?._id?.toString?.(), task.createdBy?._id?.toString?.()].filter(Boolean),
    trigger: 'task-created',
  });

  return res.status(201).json(new ApiResponse(201, { task }, 'Task created'));
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const canEdit =
    task.createdBy.toString() === req.user._id.toString() ||
    ADMIN_ROLES.includes(normalizeRole(req.user.role, req.user.role));
  if (!canEdit) throw new ApiError(403, 'Not authorized to edit this task');

  const allowed = [
    'title',
    'description',
    'priority',
    'dueDate',
    'assignedTo',
    'tags',
    'estimatedMinutes',
    'estimatedDurationMinutes',
    'startTime',
    'plannedStartAt',
    'endTime',
    'actualMinutes',
  ];
  allowed.forEach((field) => { if (req.body[field] !== undefined) task[field] = req.body[field]; });
  await task.save();
  await populateTask(task);

  if (task.assignedTo?._id) {
    emitToUser(task.assignedTo._id.toString(), 'task_updated', { task });
    emitToUser(task.assignedTo._id.toString(), 'taskUpdated', { task });
  }
  emitToRole('admin', 'task_updated', { task });
  emitToRole('admin', 'taskUpdated', { task });

  return res.json(new ApiResponse(200, { task }, 'Task updated'));
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const canDelete =
    task.createdBy.toString() === req.user._id.toString() ||
    ADMIN_ROLES.includes(normalizeRole(req.user.role, req.user.role));
  if (!canDelete) throw new ApiError(403, 'Not authorized');

  await task.deleteOne();
  return res.json(new ApiResponse(200, {}, 'Task deleted'));
});

// PATCH /api/tasks/:id/status
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, declineReason } = req.body;
  if (!status) throw new ApiError(400, 'status is required');
  if (!TASK_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid task status');
  }

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
  const isCreator = task.createdBy?.toString() === req.user._id.toString();
  const isAdmin = normalizeRole(req.user.role) === 'admin';

  if (!isAssignedUser && !isCreator && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update this task');
  }

  if (isAssignedUser && !isCreator && !isAdmin && !['in_progress', 'done', 'declined'].includes(status)) {
    throw new ApiError(403, 'Assigned users can only confirm, complete, or decline tasks');
  }

  task.status = status;
  const now = new Date(Date.now());

  if (status === 'in_progress') {
    if (!task.acceptedAt) task.acceptedAt = now;
    if (!task.actualStartedAt) task.actualStartedAt = now;
    task.declinedAt = undefined;
    task.declineReason = undefined;
  }

  if (status === 'declined') {
    task.declinedAt = now;
    task.declineReason = String(declineReason || 'Plus tard').trim();
    task.completedAt = undefined;
    task.actualFinishedAt = undefined;
  }

  if (status === 'done') {
    const finishedAt = now;
    if (!task.acceptedAt) task.acceptedAt = finishedAt;
    if (!task.actualStartedAt) task.actualStartedAt = finishedAt;
    task.completedAt = finishedAt;
    task.actualFinishedAt = finishedAt;
    task.completedBy = req.user._id;
    if (task.actualStartedAt) {
      task.actualMinutes = Math.max(1, Math.round((finishedAt.getTime() - task.actualStartedAt.getTime()) / 60000));
    }
    // Increment tasksCompleted in ActivityLog
    const today = new Date(); today.setHours(0,0,0,0);
    await ActivityLog.findOneAndUpdate(
      { userId: req.user._id, date: today },
      { $inc: { tasksCompleted: 1 }, $setOnInsert: { tenantId: req.tenantId } },
      { upsert: true }
    );
    await calculateScore(req.user._id);
  }
  await task.save();
  await populateTask(task);

  if (task.assignedTo) {
    emitToUser(task.assignedTo._id.toString(), 'task_updated', { task });
    emitToUser(task.assignedTo._id.toString(), 'taskUpdated', { task });
  }
  if (task.createdBy) {
    emitToUser(task.createdBy._id.toString(), 'task_updated', { task });
    emitToUser(task.createdBy._id.toString(), 'taskUpdated', { task });
  }
  emitToRole('admin', 'task_updated', { task });
  emitToRole('admin', 'taskUpdated', { task });

  const actorName = getDisplayName(req.user);

  if (status === 'in_progress' && task.createdBy) {
    await notifService.create(task.createdBy._id, req.tenantId, {
      type: 'info',
      title: 'Task confirmed',
      message: `${actorName} confirmed "${task.title}". It is now in progress.`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), taskStatus: 'in_progress' },
    });
  }

  if (status === 'declined' && task.createdBy) {
    await notifService.create(task.createdBy._id, req.tenantId, {
      type: 'danger',
      title: 'Task cancelled',
      message: `${actorName} chose Plus tard for "${task.title}".`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), taskStatus: 'declined', declineReason: task.declineReason },
    });
  }

  if (status === 'done' && task.createdBy) {
    await notifService.create(task.createdBy._id, req.tenantId, {
      type: task.isDelayed ? 'warning' : 'success',
      title: 'Task completed',
      message: `${actorName} completed "${task.title}"${task.isDelayed ? ' with delay' : ''}.`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), isDelayed: task.isDelayed },
    });
  }

  void refreshRecommendationsForScope({
    tenantId: req.tenantId || undefined,
    userIds: [task.assignedTo?._id?.toString?.(), task.createdBy?._id?.toString?.()].filter(Boolean),
    trigger: 'task-status-updated',
  });

  return res.json(new ApiResponse(200, { task }, 'Status updated'));
});

// GET /api/tasks/stats
export const getTaskStats = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.tenantId) filter.tenantId = req.tenantId;
  if (isEmployeeLikeRole(req.user.role)) filter.assignedTo = req.user._id;

  const statusCounts = await Task.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats = { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0, declined: 0 };
  statusCounts.forEach(({ _id, count }) => {
    stats[_id] = count;
    stats.total += count;
  });
  stats.completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return res.json(new ApiResponse(200, { stats }));
});
