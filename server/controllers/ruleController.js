import Rule from '../models/Rule.js';
import { ruleEngine } from '../services/ruleEngine.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function scopedFilter(req) {
  return req.tenantId ? { tenantId: req.tenantId } : {};
}

export const listRules = asyncHandler(async (req, res) => {
  const rules = await Rule.find(scopedFilter(req)).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, { rules }));
});

export const createRule = asyncHandler(async (req, res) => {
  const { name, description, trigger, resource, roles, conditions, action, cooldownMinutes, isActive } = req.body;

  const rule = await Rule.create({
    tenantId: req.tenantId,
    name,
    description,
    trigger,
    resource,
    roles,
    conditions,
    action,
    cooldownMinutes,
    isActive,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { rule }, 'Rule created'));
});

export const updateRule = asyncHandler(async (req, res) => {
  const rule = await Rule.findOne({ _id: req.params.id, ...scopedFilter(req) });
  if (!rule) throw new ApiError(404, 'Rule not found');

  const editable = ['name', 'description', 'trigger', 'resource', 'roles', 'conditions', 'action', 'cooldownMinutes', 'isActive'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) rule[field] = req.body[field];
  });

  await rule.save();
  res.json(new ApiResponse(200, { rule }, 'Rule updated'));
});

export const deleteRule = asyncHandler(async (req, res) => {
  const rule = await Rule.findOne({ _id: req.params.id, ...scopedFilter(req) });
  if (!rule) throw new ApiError(404, 'Rule not found');
  await rule.deleteOne();
  res.json(new ApiResponse(200, {}, 'Rule deleted'));
});

export const runRules = asyncHandler(async (req, res) => {
  const result = await ruleEngine.run({
    trigger: req.body?.trigger || 'manual',
    tenantId: req.tenantId,
  });

  res.json(new ApiResponse(200, result, 'Rule engine executed'));
});
