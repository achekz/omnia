import Rule from '../models/Rule.js';
import { ruleEngine } from '../services/ruleEngine.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Role: Construit des donnees derivees.
function scopedFilter(req) {
  return req.tenantId ? { tenantId: req.tenantId } : {};
}

// Role: Verifie les donnees ou les droits.
function validateRulePayload(payload, { partial = false } = {}) {
  const requiredFields = [
    ['name', 'Rule name'],
    ['description', 'Description'],
    ['trigger', 'Trigger'],
    ['resource', 'Resource'],
    ['conditions', 'IF condition'],
    ['action', 'THEN action'],
  ];

  const missing = [];

  for (const [field, label] of requiredFields) {
    if (partial && payload[field] === undefined) continue;
    const value = payload[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(label);
    }
  }

  const action = payload.action || {};
  if (!partial || payload.action !== undefined) {
    if (!String(action.title || '').trim()) missing.push('Notification title');
    if (!String(action.message || '').trim()) missing.push('Notification message');
  }

  const conditions = payload.conditions || [];
  if ((!partial || payload.conditions !== undefined) && Array.isArray(conditions)) {
    conditions.forEach((condition, index) => {
      if (!condition.metric) missing.push(`Condition ${index + 1} metric`);
      if (!condition.operator) missing.push(`Condition ${index + 1} operator`);
      if (condition.value === undefined || condition.value === null || condition.value === '') {
        missing.push(`Condition ${index + 1} value`);
      }
    });
  }

  if (missing.length) {
    throw new ApiError(400, `Please fill required fields: ${[...new Set(missing)].join(', ')}`);
  }
}

// Role: Recupere les donnees necessaires.
export const listRules = asyncHandler(async (req, res) => {
  const rules = await Rule.find(scopedFilter(req)).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, { rules }));
});

// Role: Cree une nouvelle ressource.
export const createRule = asyncHandler(async (req, res) => {
  const { name, description, trigger, resource, roles, conditions, action, redirectTarget, cooldownMinutes, isActive } = req.body;
  validateRulePayload(req.body);

  const rule = await Rule.create({
    tenantId: req.tenantId,
    name,
    description,
    trigger,
    resource,
    roles,
    conditions,
    action: {
      ...action,
      redirectTarget: redirectTarget || action?.redirectTarget || action?.actionUrl,
      actionUrl: redirectTarget || action?.redirectTarget || action?.actionUrl,
    },
    redirectTarget: redirectTarget || action?.redirectTarget || action?.actionUrl,
    cooldownMinutes,
    isActive,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { rule }, 'Rule created'));
});

// Role: Enregistre une modification.
export const updateRule = asyncHandler(async (req, res) => {
  const rule = await Rule.findOne({ _id: req.params.id, ...scopedFilter(req) });
  if (!rule) throw new ApiError(404, 'Rule not found');
  validateRulePayload(req.body, { partial: true });

  const editable = ['name', 'description', 'trigger', 'resource', 'roles', 'conditions', 'action', 'redirectTarget', 'cooldownMinutes', 'isActive'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) rule[field] = req.body[field];
  });

  if (req.body.redirectTarget !== undefined) {
    rule.action = {
      ...(rule.action?.toObject?.() || rule.action || {}),
      redirectTarget: req.body.redirectTarget,
      actionUrl: req.body.redirectTarget,
    };
  }

  await rule.save();
  res.json(new ApiResponse(200, { rule }, 'Rule updated'));
});

// Role: Supprime ou reinitialise des donnees.
export const deleteRule = asyncHandler(async (req, res) => {
  const rule = await Rule.findOne({ _id: req.params.id, ...scopedFilter(req) });
  if (!rule) throw new ApiError(404, 'Rule not found');
  await rule.deleteOne();
  res.json(new ApiResponse(200, {}, 'Rule deleted'));
});

// Role: Lance un traitement metier ou IA.
export const runRules = asyncHandler(async (req, res) => {
  const result = await ruleEngine.run({
    trigger: req.body?.trigger || 'manual',
    tenantId: req.tenantId,
  });

  res.json(new ApiResponse(200, result, 'Rule engine executed'));
});
