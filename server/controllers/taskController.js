// Role du fichier: contient la logique backend des requetes et reponses API.
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import MLPrediction from '../models/MLPrediction.js';
import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateScore } from '../services/scoreService.js';
import { emitToRole, emitToUser } from '../config/socket.js';
import * as notifService from '../services/notifService.js';
import { isEmployeeLikeRole, normalizeRole } from '../utils/roleNormalization.js';
import { refreshRecommendationsForScope } from '../services/recommendationService.js';
import { sendAlert } from '../services/emailService.js';
import { ruleEngine } from '../services/ruleEngine.js';

const ASSIGNABLE_ROLES = ['employee', 'stagiaire', 'comptable'];
const ADMIN_ROLES = ['company_admin', 'cabinet_admin', 'manager', 'admin'];
const TASK_STATUSES = ['todo', 'in_progress', 'done', 'overdue', 'declined'];

// Role: Recupere les donnees necessaires.
function getDisplayName(user) {
  if (!user) return 'User';
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
}

// Role: Decrit la logique populateTask.
async function populateTask(task) {
  return task.populate([
    { path: 'assignedTo', select: 'name firstName lastName email avatar role profileType' },
    { path: 'createdBy', select: 'name firstName lastName email avatar role profileType' },
    { path: 'completedBy', select: 'name firstName lastName email avatar role profileType' },
    { path: 'comments.userId', select: 'name firstName lastName email role profileType' },
  ]);
}

// Role: Recupere les donnees necessaires.
function getTaskDay(task) {
  const date = task.startTime || task.plannedStartAt || task.dueDate || task.createdAt || new Date();
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Role: Decrit la logique userCanAccessTask.
function userCanAccessTask(task, user) {
  const normalizedRole = normalizeRole(user.role, user.role);
  const isAdmin = ADMIN_ROLES.includes(normalizedRole);
  const userId = user._id.toString();

  return (
    isAdmin ||
    task.assignedTo?.toString?.() === userId ||
    task.assignedTo?._id?.toString?.() === userId ||
    task.createdBy?.toString?.() === userId ||
    task.createdBy?._id?.toString?.() === userId
  );
}

// Role: Verifie les donnees ou les droits.
function ensureTaskInTenant(task, req) {
  if (req.tenantId && task.tenantId?.toString?.() !== req.tenantId.toString()) {
    throw new ApiError(404, 'Task not found');
  }
}

// Role: Construit des donnees derivees.
function scopedUserLookup(req, userId) {
  return {
    _id: userId,
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
  };
}

// Role: Construit des donnees derivees.
function buildTaskAiRecommendation(task) {
  const isLate =
    task.status === 'overdue' ||
    task.isDelayed ||
    (task.dueDate && task.dueDate < new Date()) ||
    Number(task.delayDays || 0) > 0;

  if (!isLate || task.status === 'done') {
    return {
      shouldRescheduleToday: false,
      recommendation: 'No urgent reschedule needed. Continue current execution plan.',
      priority: 'low',
    };
  }

  return {
    shouldRescheduleToday: true,
    recommendation: 'Cette tâche est en retard, replanifier aujourd’hui.',
    priority: task.status === 'overdue' || Number(task.delayDays || 0) >= 2 ? 'high' : 'medium',
  };
}

// Role: Construit des donnees derivees.
function calculateProductivityScore(tasks = []) {
  if (!tasks.length) return 0;
  const completed = tasks.filter((task) => task.status === 'done').length;
  const overdue = tasks.filter((task) => task.status === 'overdue' || task.isDelayed).length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const completionScore = (completed / tasks.length) * 70;
  const progressScore = (inProgress / tasks.length) * 15;
  const delayPenalty = (overdue / tasks.length) * 35;
  return Math.max(0, Math.min(100, Math.round(completionScore + progressScore + 15 - delayPenalty)));
}

// Role: Construit des donnees derivees.
function calculateDelayScore(tasks = []) {
  if (!tasks.length) return 0;
  const risky = tasks.filter((task) => task.status === 'overdue' || task.isDelayed || Number(task.delayDays || 0) > 0).length;
  return Math.round((risky / tasks.length) * 100);
}

// Role: Construit des donnees derivees.
function buildProductivityEvolution(tasks = []) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  return days.map((date) => {
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const dayTasks = tasks.filter((task) => {
      const completedAt = task.completedAt || task.actualFinishedAt || task.updatedAt || task.createdAt;
      const value = completedAt ? new Date(completedAt) : null;
      return value && value >= date && value < next;
    });
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      completed: dayTasks.filter((task) => task.status === 'done').length,
      overdue: dayTasks.filter((task) => task.status === 'overdue' || task.isDelayed).length,
      productivity: calculateProductivityScore(dayTasks),
    };
  });
}

// Role: Construit des donnees derivees.
function buildTaskStats(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'done').length;
  const pending = tasks.filter((task) => ['todo', 'in_progress'].includes(task.status)).length;
  const overdue = tasks.filter((task) => task.status === 'overdue' || task.isDelayed).length;
  const later = tasks.filter((task) => task.status === 'declined').length;
  const productivityScore = calculateProductivityScore(tasks);
  const delayScore = calculateDelayScore(tasks);
  return {
    total,
    completed,
    pending,
    overdue,
    later,
    productivityScore,
    delayScore,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    productivityEvolution: buildProductivityEvolution(tasks),
  };
}

// Role: Construit des donnees derivees.
function mapTaskWithAi(task) {
  const raw = typeof task.toObject === 'function' ? task.toObject() : task;
  return {
    ...raw,
    progress: raw.progress ?? (raw.status === 'done' ? 100 : raw.status === 'in_progress' ? 45 : 0),
    delayRisk: raw.delayRisk ?? Math.max(0, Math.min(1, Number(raw.delayDays || 0) / 5)),
    aiRecommendation: raw.aiRecommendation?.recommendation ? raw.aiRecommendation : buildTaskAiRecommendation(raw),
  };
}

// Role: Envoie un message ou une notification.
async function sendTaskAssignmentEmail(task, assignedUser) {
  if (!assignedUser?.email) return;

  try {
    const taskDay = getTaskDay(task);
    await sendAlert(
      assignedUser.email,
      `New OmniAI task for ${taskDay}`,
      `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px">
          <h2 style="margin:0 0 12px;color:#111827">New task assigned by admin</h2>
          <p style="margin:0 0 16px;color:#4b5563">You have a new task scheduled for <strong>${taskDay}</strong>.</p>
          <div style="background:#f9fafb;border-radius:12px;padding:16px">
            <p style="margin:0 0 8px;font-weight:700;color:#111827">${task.title}</p>
            <p style="margin:0;color:#4b5563">${task.description || 'No description provided.'}</p>
          </div>
          <p style="margin:16px 0 0;color:#6b7280">Open OmniAI to confirm, complete, or comment on this task.</p>
        </div>
      `,
    );
  } catch (error) {
    console.error('[Task Email] Failed to send task assignment email:', error.message);
  }
}

// Role: Decrit la logique evaluateTaskRules.
async function evaluateTaskRules(task, req, trigger = 'task') {
  try {
    await ruleEngine.handleEvent({
      resource: 'task',
      trigger,
      tenantId: req.tenantId || task.tenantId,
      task,
      user: task.assignedTo || task.createdBy || req.user,
    });
  } catch (error) {
    console.error('[RuleEngine] Task event failed:', error.message);
  }
}

// GET /api/tasks
// Role: Recupere les donnees necessaires.
export const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, userId, role, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.tenantId) filter.tenantId = req.tenantId;
  if (isEmployeeLikeRole(req.user.role)) {
    filter.assignedTo = req.user._id;
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if ((assignedTo || userId) && !isEmployeeLikeRole(req.user.role)) {
    filter.assignedTo = assignedTo || userId;
  }
  if (role && !isEmployeeLikeRole(req.user.role)) {
    const normalizedRoleFilter = normalizeRole(role, role);
    const usersWithRole = await User.find({
      ...(req.tenantId ? { tenantId: req.tenantId } : {}),
      role: normalizedRoleFilter,
    }).select('_id');
    filter.$or = [
      { assignedRole: normalizedRoleFilter },
      { assignedTo: { $in: usersWithRole.map((user) => user._id) } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'name firstName lastName email avatar role profileType')
      .populate('createdBy', 'name firstName lastName email avatar role profileType')
      .populate('completedBy', 'name firstName lastName email avatar role profileType')
      .populate('comments.userId', 'name firstName lastName email role profileType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { tasks, total, page: parseInt(page), limit: parseInt(limit) }));
});

// GET /api/tasks/users
// Role: Recupere les comptes avec statistiques de taches.
export const getTaskUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const scope = req.tenantId ? { tenantId: req.tenantId } : {};
  const normalizedRole = role && role !== 'all' ? normalizeRole(role, role) : null;
  const users = await User.find({
    ...scope,
    role: normalizedRole || { $in: ASSIGNABLE_ROLES },
    isActive: true,
  })
    .select('_id name firstName lastName email avatar role profileType tenantId lastLogin isActive')
    .sort({ role: 1, name: 1 })
    .lean();

  const userIds = users.map((user) => user._id);
  const tasks = await Task.find({
    ...scope,
    assignedTo: { $in: userIds },
  }).lean();

  const usersWithStats = users.map((user) => {
    const userTasks = tasks.filter((task) => String(task.assignedTo) === String(user._id));
    const stats = buildTaskStats(userTasks);
    return {
      ...user,
      fullName: getDisplayName(user),
      isOnline: Boolean(user.lastLogin && Date.now() - new Date(user.lastLogin).getTime() < 15 * 60 * 1000),
      pendingTasks: stats.pending,
      productivityScore: stats.productivityScore,
      taskStats: stats,
    };
  });

  res.json(new ApiResponse(200, { users: usersWithStats }, 'Task users retrieved'));
});

// GET /api/tasks/user/:userId
// Role: Recupere les taches d un compte choisi.
export const getTasksByUser = asyncHandler(async (req, res) => {
  const { status, priority, deadline } = req.query;
  const user = await User.findOne(scopedUserLookup(req, req.params.userId)).select('_id name firstName lastName email avatar role profileType');
  if (!user) throw new ApiError(404, 'User not found');

  const filter = {
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
    assignedTo: user._id,
  };

  if (status && status !== 'all') filter.status = status;
  if (priority && priority !== 'all') filter.priority = priority;

  if (deadline && deadline !== 'all') {
    const now = new Date();
    if (deadline === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      filter.dueDate = { $gte: start, $lte: end };
    } else if (deadline === 'week') {
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filter.dueDate = { $gte: now, $lte: end };
    } else if (deadline === 'overdue') {
      filter.dueDate = { $lt: now };
      filter.status = { $ne: 'done' };
    }
  }

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name firstName lastName email avatar role profileType')
    .populate('createdBy', 'name firstName lastName email avatar role profileType')
    .populate('completedBy', 'name firstName lastName email avatar role profileType')
    .sort({ status: 1, dueDate: 1, createdAt: -1 });

  res.json(new ApiResponse(200, {
    user,
    tasks: tasks.map(mapTaskWithAi),
    stats: buildTaskStats(tasks),
  }, 'User tasks retrieved'));
});

// GET /api/tasks/user/:userId/stats
// Role: Recupere les statistiques taches d un compte.
export const getUserTaskStats = asyncHandler(async (req, res) => {
  const user = await User.findOne(scopedUserLookup(req, req.params.userId)).select('_id');
  if (!user) throw new ApiError(404, 'User not found');

  const tasks = await Task.find({
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
    assignedTo: user._id,
  }).lean();

  res.json(new ApiResponse(200, { stats: buildTaskStats(tasks) }, 'User task stats retrieved'));
});

// GET /api/tasks/:id
// Role: Recupere les donnees necessaires.
export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name firstName lastName email avatar role profileType')
    .populate('createdBy', 'name firstName lastName email avatar role profileType')
    .populate('completedBy', 'name firstName lastName email avatar role profileType')
    .populate('comments.userId', 'name firstName lastName email role profileType');

  if (!task) throw new ApiError(404, 'Task not found');
  if (req.tenantId && task.tenantId?.toString?.() !== req.tenantId.toString()) {
    throw new ApiError(404, 'Task not found');
  }
  if (!userCanAccessTask(task, req.user)) {
    throw new ApiError(403, 'Not authorized to view this task');
  }

  return res.json(new ApiResponse(200, { task: { ...task.toObject(), aiRecommendation: buildTaskAiRecommendation(task) } }));
});

// POST /api/tasks
// Role: Cree une nouvelle ressource.
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

  if (!ADMIN_ROLES.includes(normalizeRole(req.user.role, req.user.role))) {
    throw new ApiError(403, 'Only admin can plan and assign tasks');
  }

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
    assignedBy: req.user._id,
    tenantId: req.tenantId,
    progress: 0,
  };

  if (!assignedTo) {
    throw new ApiError(400, 'Assigned user is required');
  }

  const assignedUser = await User.findOne(scopedUserLookup(req, assignedTo)).select('_id email name firstName lastName role tenantId');
  if (!assignedUser) {
    throw new ApiError(404, 'Assigned user not found');
  }
  const normalizedAssignedRole = normalizeRole(assignedUser.role, 'employee');
  if (!ASSIGNABLE_ROLES.includes(normalizedAssignedRole)) {
    throw new ApiError(400, 'Task can only be assigned to an employee, stagiaire, or comptable');
  }

  taskData.assignedTo = assignedUser._id;
  taskData.assignedRole = normalizedAssignedRole;
  taskData.role = normalizedAssignedRole;
  taskData.tenantId = req.tenantId || assignedUser.tenantId;

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
    await notifService.create(task.assignedTo._id, task.tenantId || req.tenantId, {
      type: 'info',
      title: 'New task assigned',
      message: `A new task "${task.title}" was assigned to you for ${getTaskDay(task)}. Confirm it or choose Plus tard.`,
      source: 'user',
      actionUrl: '/tasks',
      metadata: { taskId: task._id.toString(), taskTitle: task.title, taskStatus: 'todo', taskDay: getTaskDay(task), actionRequired: true },
    });
    void sendTaskAssignmentEmail(task, task.assignedTo);
  }

  emitToRole('admin', 'task_created', { task });
  emitToRole('admin', 'taskCreated', { task });

  await evaluateTaskRules(task, req, 'task');

  void refreshRecommendationsForScope({
    tenantId: task.tenantId || req.tenantId || undefined,
    userIds: [task.assignedTo?._id?.toString?.(), task.createdBy?._id?.toString?.()].filter(Boolean),
    trigger: 'task-created',
  });

  return res.status(201).json(new ApiResponse(201, { task }, 'Task created'));
});

// PUT /api/tasks/:id
// Role: Enregistre une modification.
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  ensureTaskInTenant(task, req);

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
    'lateReason',
    'progress',
  ];
  if (req.body.assignedTo !== undefined) {
  const assignedUser = await User.findOne(scopedUserLookup(req, req.body.assignedTo))
    .select('_id email name firstName lastName role tenantId');
  if (!assignedUser) {
    throw new ApiError(404, 'Assigned user not found');
  }
  const normalizedAssignedRole = normalizeRole(assignedUser.role, 'employee');
  if (!ASSIGNABLE_ROLES.includes(normalizedAssignedRole)) {
    throw new ApiError(400, 'Task can only be assigned to an employee, stagiaire, or comptable');
  }
  task.assignedRole = normalizedAssignedRole;
  task.role = normalizedAssignedRole;
  task.tenantId = req.tenantId || task.tenantId || assignedUser.tenantId;
}
  allowed.forEach((field) => { if (req.body[field] !== undefined) task[field] = req.body[field]; });
  await task.save();
  await populateTask(task);

  if (task.assignedTo?._id) {
    emitToUser(task.assignedTo._id.toString(), 'task_updated', { task });
    emitToUser(task.assignedTo._id.toString(), 'taskUpdated', { task });
    await notifService.create(task.assignedTo._id, task.tenantId || req.tenantId, {
      type: 'info',
      title: 'Task updated',
      message: `"${task.title}" was updated by admin.`,
      source: 'user',
      actionUrl: '/tasks',
      metadata: { taskId: task._id.toString(), taskStatus: task.status },
    });
  }
  emitToRole('admin', 'task_updated', { task });
  emitToRole('admin', 'taskUpdated', { task });

  await evaluateTaskRules(task, req, 'task');

  return res.json(new ApiResponse(200, { task }, 'Task updated'));
});

// DELETE /api/tasks/:id
// Role: Supprime ou reinitialise des donnees.
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  ensureTaskInTenant(task, req);

  const canDelete =
    task.createdBy.toString() === req.user._id.toString() ||
    ADMIN_ROLES.includes(normalizeRole(req.user.role, req.user.role));
  if (!canDelete) throw new ApiError(403, 'Not authorized');

  await task.deleteOne();
  return res.json(new ApiResponse(200, {}, 'Task deleted'));
});

// PATCH /api/tasks/:id/status
// Role: Enregistre une modification.
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, declineReason, lateReason, progress } = req.body;
  if (!status) throw new ApiError(400, 'status is required');
  if (!TASK_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid task status');
  }

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  ensureTaskInTenant(task, req);

  const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
  const isCreator = task.createdBy?.toString() === req.user._id.toString();
  const isAdmin = normalizeRole(req.user.role) === 'admin';

  if (!isAssignedUser && !isCreator && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update this task');
  }

  if (isAssignedUser && !isCreator && !isAdmin && !['in_progress', 'done', 'declined'].includes(status)) {
    throw new ApiError(403, 'Assigned users can only confirm, complete, or decline tasks');
  }

  if (status === 'declined' && !String(declineReason || '').trim()) {
    throw new ApiError(400, 'Reason is required when choosing Plus tard');
  }

  const isLateCompletion = status === 'done' && (
    task.status === 'overdue' ||
    task.isDelayed ||
    (task.dueDate && task.dueDate < new Date())
  );

  if (isLateCompletion && isAssignedUser && !String(lateReason || '').trim()) {
    throw new ApiError(400, 'Reason is required when completing a delayed task');
  }

  task.status = status;
  const now = new Date(Date.now());

  if (status === 'in_progress') {
    if (!task.acceptedAt) task.acceptedAt = now;
    if (!task.actualStartedAt) task.actualStartedAt = now;
    if (!task.startedAt) task.startedAt = now;
    task.progress = Math.max(Number(progress || task.progress || 35), 35);
    task.declinedAt = undefined;
    task.declineReason = undefined;
  }

  if (status === 'declined') {
    task.declinedAt = now;
    task.declineReason = String(declineReason || '').trim();
    task.completedAt = undefined;
    task.actualFinishedAt = undefined;
    task.progress = 0;
  }

  if (status === 'done') {
    const finishedAt = now;
    if (!task.acceptedAt) task.acceptedAt = finishedAt;
    if (!task.actualStartedAt) task.actualStartedAt = finishedAt;
    task.completedAt = finishedAt;
    task.actualFinishedAt = finishedAt;
    task.completedBy = req.user._id;
    task.progress = 100;
    if (String(lateReason || '').trim()) {
      task.lateReason = String(lateReason).trim();
    }
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
  if (progress !== undefined && status !== 'done') {
    task.progress = Math.max(0, Math.min(100, Number(progress) || 0));
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

  await evaluateTaskRules(task, req, 'task');

  const actorName = getDisplayName(req.user);

  if (status === 'in_progress' && task.createdBy) {
    await notifService.create(task.createdBy._id, task.tenantId || req.tenantId, {
      type: 'info',
      title: 'Task confirmed',
      message: `${actorName} confirmed "${task.title}". It is now in progress.`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), taskStatus: 'in_progress' },
    });
  }

  if (status === 'declined' && task.createdBy) {
    await notifService.create(task.createdBy._id, task.tenantId || req.tenantId, {
      type: 'danger',
      title: 'Task cancelled',
      message: `${actorName} chose Plus tard for "${task.title}".`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), taskStatus: 'declined', declineReason: task.declineReason },
    });
  }

  if (status === 'done' && task.createdBy) {
    await notifService.create(task.createdBy._id, task.tenantId || req.tenantId, {
      type: task.isDelayed ? 'warning' : 'success',
      title: 'Task completed',
      message: `${actorName} completed "${task.title}"${task.isDelayed ? ' with delay' : ''}.`,
      source: 'user',
      actionUrl: '/admin/tasks',
      metadata: { taskId: task._id.toString(), isDelayed: task.isDelayed },
    });
  }

  void (async () => {
    const userIds = [task.assignedTo?._id?.toString?.(), task.createdBy?._id?.toString?.()].filter(Boolean);
    const savedRecommendation = await refreshRecommendationsForScope({
      tenantId: req.tenantId || undefined,
      userIds,
      trigger: `task-${status}`,
    });

    if (task.assignedTo?._id && savedRecommendation) {
      await MLPrediction.create({
        userId: task.assignedTo._id,
        tenantId: task.tenantId || req.tenantId,
        modelType: 'recommendation',
        input: {
          trigger: `task-${status}`,
          taskId: task._id.toString(),
          status,
          priority: task.priority,
          delayDays: task.delayDays,
          isDelayed: task.isDelayed,
        },
        output: savedRecommendation,
        recommendations: savedRecommendation.recommendations || [],
      });

      emitToUser(task.assignedTo._id.toString(), 'ml_insights_updated', {
        taskId: task._id.toString(),
        status,
        recommendationId: savedRecommendation._id?.toString?.(),
      });
    }
  })().catch((error) => {
    console.error('[Task ML] Failed to refresh recommendations after task status update:', error);
  });

  return res.json(new ApiResponse(200, { task }, 'Status updated'));
});

// PUT /api/tasks/:id/reschedule
// Role: Decrit la logique rescheduleTaskToday.
export const rescheduleTaskToday = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  ensureTaskInTenant(task, req);

  if (req.tenantId && task.tenantId?.toString?.() !== req.tenantId.toString()) {
    throw new ApiError(404, 'Task not found');
  }

  const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
  const isCreator = task.createdBy?.toString() === req.user._id.toString();
  const isAdmin = ADMIN_ROLES.includes(normalizeRole(req.user.role, req.user.role));
  if (!isAssignedUser && !isCreator && !isAdmin) {
    throw new ApiError(403, 'Not authorized to reschedule this task');
  }

  const now = new Date();
  const plannedStartAt = req.body?.startTime ? new Date(req.body.startTime) : now;
  const duration = Number(task.estimatedMinutes || task.estimatedDurationMinutes || req.body?.estimatedMinutes || 60) || 60;
  const dueDate = new Date(plannedStartAt.getTime() + duration * 60 * 1000);

  task.plannedStartAt = plannedStartAt;
  task.startTime = plannedStartAt;
  task.dueDate = dueDate;
  task.endTime = dueDate;
  task.status = req.body?.status === 'todo' ? 'todo' : 'in_progress';
  task.acceptedAt = task.acceptedAt || now;
  task.actualStartedAt = task.actualStartedAt || (task.status === 'in_progress' ? now : undefined);
  task.declinedAt = undefined;
  task.declineReason = undefined;
  task.delayDays = 0;
  task.isDelayed = false;
  task.lateReason = String(req.body?.reason || 'AI suggested reschedule for today').trim();

  await task.save();
  await populateTask(task);

  const aiRecommendation = buildTaskAiRecommendation(task);

  if (task.assignedTo?._id) {
    emitToUser(task.assignedTo._id.toString(), 'task_updated', { task });
    emitToUser(task.assignedTo._id.toString(), 'taskUpdated', { task });
    await notifService.create(task.assignedTo._id, task.tenantId || req.tenantId, {
      type: 'info',
      title: 'Task rescheduled',
      message: `"${task.title}" was rescheduled for today.`,
      source: 'ai_rules',
      actionUrl: `/tasks/${task._id}`,
      metadata: { taskId: task._id.toString(), taskStatus: task.status, aiRecommendation },
    });
  }

  emitToRole('admin', 'task_updated', { task });
  emitToRole('admin', 'taskUpdated', { task });

  await evaluateTaskRules(task, req, 'task');

  await MLPrediction.create({
    userId: task.assignedTo?._id || task.assignedTo || req.user._id,
    tenantId: task.tenantId || req.tenantId,
    modelType: 'recommendation',
    input: {
      trigger: 'task-reschedule-today',
      taskId: task._id.toString(),
      previousLateSignal: true,
    },
    output: aiRecommendation,
    recommendations: [aiRecommendation.recommendation],
  });

  return res.json(new ApiResponse(200, { task: { ...task.toObject(), aiRecommendation } }, 'Task rescheduled for today'));
});

// POST /api/tasks/:id/comments
// Role: Cree une nouvelle ressource.
export const addTaskComment = asyncHandler(async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    throw new ApiError(400, 'Comment is required');
  }

  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found');
  ensureTaskInTenant(task, req);

  const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
  const isCreator = task.createdBy?.toString() === req.user._id.toString();
  const isAdmin = normalizeRole(req.user.role) === 'admin';

  if (!isAssignedUser && !isCreator && !isAdmin) {
    throw new ApiError(403, 'Not authorized to comment on this task');
  }

  task.comments.push({ userId: req.user._id, message });
  await task.save();
  await populateTask(task);

  const targetUserId = isAdmin ? task.assignedTo?._id || task.assignedTo : task.createdBy;
  if (targetUserId) {
    await notifService.create(targetUserId, task.tenantId || req.tenantId, {
      type: 'info',
      title: 'Task comment added',
      message: `${getDisplayName(req.user)} commented on "${task.title}".`,
      source: 'user',
      actionUrl: isAdmin ? '/tasks' : '/admin/tasks',
      metadata: { taskId: task._id.toString() },
    });
  }

  return res.json(new ApiResponse(200, { task }, 'Comment added'));
});

// PATCH /api/tasks/:id/accept
// Role: Decrit la logique acceptTask.
export const acceptTask = (req, res, next) => {
  req.body = { ...req.body, status: 'in_progress' };
  return updateTaskStatus(req, res, next);
};

// PATCH /api/tasks/:id/later
// Role: Envoie un message ou une notification.
export const sendTaskLater = (req, res, next) => {
  req.body = { ...req.body, status: 'declined', declineReason: req.body?.declineReason };
  return updateTaskStatus(req, res, next);
};

// GET /api/tasks/stats
// Role: Recupere les donnees necessaires.
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
