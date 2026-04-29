import Rule from '../models/Rule.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import FinancialRecord from '../models/FinancialRecord.js';
import * as notifService from './notifService.js';
import { normalizeRole } from '../utils/roleNormalization.js';

const priorityScores = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

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

function daysBetween(from, to = new Date()) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function isInCooldown(rule) {
  if (!rule.lastTriggeredAt || !rule.cooldownMinutes) return false;
  const nextAllowedAt = rule.lastTriggeredAt.getTime() + rule.cooldownMinutes * 60 * 1000;
  return Date.now() < nextAllowedAt;
}

async function getTenantAdmins(tenantId) {
  if (!tenantId) return [];
  return User.find({
    tenantId,
    role: { $in: ['admin', 'entreprise', 'company_admin', 'cabinet_admin'] },
    isActive: true,
  }).select('_id');
}

async function resolveActionTargets(rule, context) {
  const target = rule.action?.target || 'currentUser';

  if (target === 'tenantAdmins') {
    const admins = await getTenantAdmins(context.tenantId);
    return admins.map((admin) => admin._id);
  }

  if (target === 'assignedUser' && context.task?.assignedTo) {
    return [context.task.assignedTo._id || context.task.assignedTo];
  }

  if (target === 'creator' && context.task?.createdBy) {
    return [context.task.createdBy._id || context.task.createdBy];
  }

  if (context.user?._id) {
    return [context.user._id];
  }

  return [];
}

async function notify(rule, context) {
  const targetIds = await resolveActionTargets(rule, context);
  await Promise.all(
    targetIds.map((userId) =>
      notifService.create(userId, context.tenantId, {
        type: rule.action.severity,
        title: rule.action.title,
        message: rule.action.message,
        source: 'rule_engine',
        actionUrl: rule.action.actionUrl,
        metadata: {
          ruleId: rule._id.toString(),
          resource: rule.resource,
          taskId: context.task?._id?.toString?.(),
        },
      }),
    ),
  );
}

async function metricValue(rule, condition, context) {
  if (condition.metric === 'task.delayDays') {
    if (!context.task?.dueDate) return 0;
    return context.task.dueDate < new Date() ? daysBetween(context.task.dueDate) : 0;
  }

  if (condition.metric === 'task.priorityScore') {
    return priorityScores[context.task?.priority] || 0;
  }

  if (condition.metric === 'task.status') {
    return context.task?.status;
  }

  if (condition.metric === 'student.examDueDays') {
    if (!context.task?.dueDate) return 999;
    const hasExamTag = (context.task.tags || []).some((tag) => ['exam', 'examen', 'revision'].includes(String(tag).toLowerCase()));
    return hasExamTag ? daysBetween(new Date(), context.task.dueDate) : 999;
  }

  if (condition.metric === 'finance.recordAmount') {
    return context.record?.amount || 0;
  }

  if (condition.metric === 'finance.expensesThisMonth' || condition.metric === 'finance.balanceThisMonth') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const records = await FinancialRecord.find({
      tenantId: context.tenantId,
      date: { $gte: start },
    }).select('type amount');

    const income = records.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0);
    const expense = records.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0);

    return condition.metric === 'finance.expensesThisMonth' ? expense : income - expense;
  }

  return undefined;
}

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

async function contextsForRule(rule, scopeTenantId) {
  const baseFilter = rule.tenantId ? { tenantId: rule.tenantId } : (scopeTenantId ? { tenantId: scopeTenantId } : {});

  if (rule.resource === 'task' || rule.resource === 'student') {
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

  if (rule.resource === 'finance') {
    const records = await FinancialRecord.find(baseFilter).sort({ createdAt: -1 }).limit(100);
    const tenants = [...new Set(records.map((record) => record.tenantId?.toString()).filter(Boolean))];
    const adminsByTenant = new Map();

    for (const tenantId of tenants) {
      adminsByTenant.set(tenantId, await getTenantAdmins(tenantId));
    }

    return records.map((record) => ({
      record,
      tenantId: record.tenantId,
      user: adminsByTenant.get(record.tenantId?.toString())?.[0],
    }));
  }

  return [];
}

class RuleEngine {
  async ensureDefaultRules() {
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
          actionUrl: '/tasks',
        },
        cooldownMinutes: 720,
      },
      {
        name: 'High expense anomaly guard',
        description: 'IF monthly expenses are high THEN notify tenant admins',
        trigger: 'scheduled',
        resource: 'finance',
        roles: ['admin', 'entreprise', 'comptable'],
        conditions: [{ metric: 'finance.expensesThisMonth', operator: 'gt', value: 10000 }],
        action: {
          type: 'notify',
          target: 'tenantAdmins',
          severity: 'danger',
          title: 'Budget alert',
          message: 'Monthly expenses exceeded the configured safety threshold.',
          actionUrl: '/budget',
        },
        cooldownMinutes: 720,
      },
      {
        name: 'Exam revision reminder',
        description: 'IF tagged exam/revision task is due soon THEN notify student',
        trigger: 'scheduled',
        resource: 'student',
        roles: ['stagiaire'],
        conditions: [{ metric: 'student.examDueDays', operator: 'lte', value: 3 }],
        action: {
          type: 'notify',
          target: 'assignedUser',
          severity: 'info',
          title: 'Revision plan reminder',
          message: 'An exam is close. Generate and follow your revision plan.',
          actionUrl: '/academics/study-planner',
        },
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
}

export const ruleEngine = new RuleEngine();
