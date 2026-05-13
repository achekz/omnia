// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import Rule from '../models/Rule.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import * as notifService from './notifService.js';
import { normalizeRole } from '../utils/roleNormalization.js';

const priorityScores = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Role: Decrit la logique compare.
function compare(actual, operator, expected) {
  switch (operator) {
    case 'gt': return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'eq': return String(actual) === String(expected);
    case 'neq': return String(actual) !== String(expected);
    case 'in': return Array.isArray(expected) && expected.map(String).includes(String(actual));
    case 'contains': return Array.isArray(actual) && actual.map(String).includes(String(expected));
    default: return false;
  }
}

// Role: Decrit la logique daysBetween.
function daysBetween(from, to = new Date()) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

// Role: Retourne un etat booleen.
function isInCooldown(rule) {
  if (!rule.lastTriggeredAt || !rule.cooldownMinutes) return false;
  const nextAllowedAt = rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000;
  return Date.now() < nextAllowedAt;
}

// Role: Recupere les donnees necessaires.
function getObjectId(value) {
  return value?._id || value || null;
}

// Role: Construit des donnees derivees.
function buildRedirectTarget(rule, context) {
  const rawTarget = rule.redirectTarget || rule.action?.redirectTarget || rule.action?.actionUrl || defaultRedirectForResource(rule.resource);
  return String(rawTarget)
    .replaceAll('{taskId}', context.task?._id?.toString?.() || '')
    .replaceAll('{recordId}', context.record?._id?.toString?.() || '')
    .replaceAll('{userId}', context.user?._id?.toString?.() || '');
}

// Role: Decrit la logique defaultRedirectForResource.
function defaultRedirectForResource(resource) {
  return '/tasks';
}

// Role: Recupere les donnees necessaires.
async function getTenantAdmins(tenantId) {
  if (!tenantId) return [];
  return User.find({
    tenantId,
    role: 'admin',
    isActive: true,
  }).select('_id');
}

// Role: Construit des donnees derivees.
async function resolveActionTargets(rule, context) {
  const target = rule.action?.target || 'currentUser';

  if (target === 'tenantAdmins') {
    const admins = await getTenantAdmins(context.tenantId);
    return admins.map((admin) => admin._id);
  }

  if (target === 'assignedUser') {
    const assignedUser = getObjectId(context.task?.assignedTo);
    return assignedUser ? [assignedUser] : [];
  }

  if (target === 'creator') {
    const creator = getObjectId(context.task?.createdBy) || getObjectId(context.record?.createdBy);
    return creator ? [creator] : [];
  }

  if (context.user?._id) {
    return [context.user._id];
  }

  return [];
}

// Role: Envoie un message ou une notification.
async function notify(rule, context) {
  const targetIds = await resolveActionTargets(rule, context);
  const redirectTarget = buildRedirectTarget(rule, context);

  await Promise.all(
    targetIds.map((userId) =>
      notifService.create(userId, context.tenantId, {
        type: rule.action.severity,
        title: rule.action.title,
        message: rule.action.message,
        source: 'rule_engine',
        redirectTarget,
        actionUrl: redirectTarget,
        metadata: {
          ruleId: rule._id.toString(),
          resource: rule.resource,
          taskId: context.task?._id?.toString?.(),
          recordId: context.record?._id?.toString?.(),
          redirectTarget,
        },
      }),
    ),
  );
}

// Role: Decrit la logique metricValue.
async function metricValue(rule, condition, context) {
  if (condition.metric === 'task.delayDays') {
    if (Number.isFinite(Number(context.task?.delayDays))) return Number(context.task.delayDays);
    if (!context.task?.dueDate) return 0;
    return context.task.dueDate < new Date() ? daysBetween(context.task.dueDate) : 0;
  }

  if (condition.metric === 'task.priorityScore') {
    return Number(context.task?.priorityScore || priorityScores[context.task?.priority] || 0);
  }

  if (condition.metric === 'task.status') {
    return context.task?.status;
  }

  return undefined;
}

// Role: Decrit la logique matchesRule.
async function matchesRule(rule, context) {
  if (isInCooldown(rule)) return false;

  if (rule.roles?.length && context.user?.role) {
    const currentRole = normalizeRole(context.user.role, context.user.role);
    const allowedRoles = rule.roles.map((role) => normalizeRole(role, role));
    if (!allowedRoles.includes(currentRole)) return false;
  }

  for (const condition of rule.conditions) {
    const actual = await metricValue(rule, condition, context);
    if (!compare(actual, condition.operator, condition.value)) {
      return false;
    }
  }

  return true;
}

// Role: Decrit la logique contextsForRule.
async function contextsForRule(rule, scopeTenantId) {
  const baseFilter = rule.tenantId ? { tenantId: rule.tenantId } : (scopeTenantId ? { tenantId: scopeTenantId } : {});

  if (rule.resource === 'task' || rule.resource === 'stagiaire') {
    const tasks = await Task.find({
      ...baseFilter,
      status: { $in: ['todo', 'in_progress', 'overdue'] },
    }).populate('assignedTo createdBy', 'role tenantId isActive');

    return tasks.map((task) => ({
      task,
      tenantId: task.tenantId,
      user: task.assignedTo || task.createdBy,
    }));
  }

  return [];
}

class RuleEngine {
  async ensureDefaultRules() {
    await Rule.deleteMany({
      $or: [
        { name: 'Exam revision reminder' },
        { resource: 'student' },
        { 'conditions.metric': { $in: ['stagiaire.examDueDays', 'student.examDueDays'] } },
      ],
    });

    await Promise.all([
      Rule.updateMany(
        { tenantId: { $exists: false }, name: 'Task delay alert' },
        { $set: { redirectTarget: '/tasks/{taskId}', 'action.redirectTarget': '/tasks/{taskId}', 'action.actionUrl': '/tasks/{taskId}' } },
      ),
    ]);

    const defaultRules = [
      {
        name: 'Task delay alert',
        description: 'IF task delay > 2 days THEN notify assigned user',
        trigger: 'scheduled',
        resource: 'task',
        roles: ['employee', 'stagiaire'],
        conditions: [{ metric: 'task.delayDays', operator: 'gt', value: 2 }],
        action: {
          type: 'notify',
          target: 'assignedUser',
          severity: 'warning',
          title: 'Task delay alert',
          message: 'A task assigned to you is delayed by more than 2 days.',
          redirectTarget: '/tasks/{taskId}',
          actionUrl: '/tasks/{taskId}',
        },
        redirectTarget: '/tasks/{taskId}',
        cooldownMinutes: 720,
      },
    ];

    for (const rule of defaultRules) {
      await Rule.updateOne(
        { tenantId: { $exists: false }, name: rule.name },
        { $setOnInsert: rule },
        { upsert: true },
      );
    }
  }

  async run({ trigger = 'scheduled', tenantId } = {}) {
    await this.ensureDefaultRules();

    const filter = {
      isActive: true,
      trigger: { $in: [trigger, 'scheduled'] },
      ...(tenantId ? { $or: [{ tenantId }, { tenantId: { $exists: false } }] } : {}),
    };

    const rules = await Rule.find(filter);
    let triggeredCount = 0;

    for (const rule of rules) {
      const contexts = await contextsForRule(rule, tenantId);

      for (const context of contexts) {
        if (await matchesRule(rule, context)) {
          await notify(rule, context);
          rule.lastTriggeredAt = new Date();
          triggeredCount += 1;
          await rule.save();
          break;
        }
      }
    }

    console.log(`[RuleEngine] executed trigger=${trigger}, rules=${rules.length}, triggered=${triggeredCount}`);
    return { rulesEvaluated: rules.length, triggeredCount };
  }

  async handleEvent({ resource, trigger, tenantId, task, record, user } = {}) {
    await this.ensureDefaultRules();

    const resourceFilter = resource === 'task'
      ? { resource: { $in: ['task', 'stagiaire'] } }
      : { resource };

    const filter = {
      ...resourceFilter,
      isActive: true,
      trigger: { $in: [trigger || resource, 'scheduled'] },
      ...(tenantId ? { $or: [{ tenantId }, { tenantId: { $exists: false } }] } : {}),
    };

    const rules = await Rule.find(filter);
    let triggeredCount = 0;
    const context = {
      task,
      record,
      user,
      tenantId: tenantId || task?.tenantId || record?.tenantId,
    };

    for (const rule of rules) {
      if (await matchesRule(rule, context)) {
        await notify(rule, context);
        rule.lastTriggeredAt = new Date();
        triggeredCount += 1;
        await rule.save();
      }
    }

    console.log(`[RuleEngine] event resource=${resource}, trigger=${trigger || resource}, rules=${rules.length}, triggered=${triggeredCount}`);
    return { rulesEvaluated: rules.length, triggeredCount };
  }
}

export const ruleEngine = new RuleEngine();
