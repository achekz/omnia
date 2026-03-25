import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateScore } from '../services/scoreService.js';
import { emitToUser } from '../config/socket.js';

// GET /api/tasks
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.tenantId) filter.tenantId = req.tenantId;
  if (['employee', 'student'].includes(req.user.role)) {
    filter.assignedTo = req.user._id;
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo && !['employee','student'].includes(req.user.role)) {
    filter.assignedTo = assignedTo;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { tasks, total, page: parseInt(page), limit: parseInt(limit) }));
});

// POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, dueDate, assignedTo, tags, estimatedMinutes } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');

  const taskData = {
    title,
    description,
    priority: priority || 'medium',
    dueDate,
    tags: tags || [],
    estimatedMinutes,
    createdBy: req.user._id,
    tenantId: req.tenantId,
  };

  if (['student', 'employee'].includes(req.user.role)) {
    taskData.assignedTo = req.user._id;
  } else {
    taskData.assignedTo = assignedTo || req.user._id;
  }

  const task = await Task.create(taskData);
  await task.populate('assignedTo', 'name email avatar');

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
  }

  return res.status(201).json(new ApiResponse(201, { task }, 'Task created'));
});

// PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const canEdit =
    task.createdBy.toString() === req.user._id.toString() ||
    ['company_admin', 'cabinet_admin', 'manager'].includes(req.user.role);
  if (!canEdit) throw new ApiError(403, 'Not authorized to edit this task');

  const allowed = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'tags', 'estimatedMinutes', 'actualMinutes'];
  allowed.forEach((field) => { if (req.body[field] !== undefined) task[field] = req.body[field]; });
  await task.save();
  await task.populate('assignedTo', 'name email avatar');

  return res.json(new ApiResponse(200, { task }, 'Task updated'));
});

// DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  const canDelete =
    task.createdBy.toString() === req.user._id.toString() ||
    ['company_admin', 'cabinet_admin', 'manager'].includes(req.user.role);
  if (!canDelete) throw new ApiError(403, 'Not authorized');

  await task.deleteOne();
  return res.json(new ApiResponse(200, {}, 'Task deleted'));
});

// PATCH /api/tasks/:id/status
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new ApiError(400, 'status is required');

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');

  task.status = status;
  if (status === 'done') {
    task.completedAt = new Date();
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

  return res.json(new ApiResponse(200, { task }, 'Status updated'));
});

// GET /api/tasks/stats
export const getTaskStats = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.tenantId) filter.tenantId = req.tenantId;
  if (['employee', 'student'].includes(req.user.role)) filter.assignedTo = req.user._id;

  const statusCounts = await Task.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats = { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 };
  statusCounts.forEach(({ _id, count }) => {
    stats[_id] = count;
    stats.total += count;
  });
  stats.completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return res.json(new ApiResponse(200, { stats }));
});
