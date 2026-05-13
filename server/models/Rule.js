// Role du fichier: definit le schema MongoDB et la structure des donnees.
import mongoose from 'mongoose';
import { normalizeRole } from '../utils/roleNormalization.js';

const { Schema } = mongoose;

const ruleConditionSchema = new Schema(
  {
    metric: {
      type: String,
      required: true,
      enum: [
        'task.delayDays',
        'task.priorityScore',
        'task.status',
      ],
    },
    operator: {
      type: String,
      required: true,
      enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'in', 'contains'],
    },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const ruleActionSchema = new Schema(
  {
    type: { type: String, enum: ['notify'], default: 'notify' },
    target: {
      type: String,
      enum: ['currentUser', 'assignedUser', 'creator', 'tenantAdmins'],
      default: 'currentUser',
    },
    severity: { type: String, enum: ['info', 'warning', 'danger'], default: 'warning' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    redirectTarget: { type: String },
    actionUrl: { type: String },
  },
  { _id: false },
);

const ruleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    trigger: {
      type: String,
      enum: ['scheduled', 'task'],
      default: 'scheduled',
      index: true,
    },
    resource: {
      type: String,
      enum: ['task', 'stagiaire'],
      required: true,
    },
    roles: [{ type: String }],
    conditions: {
      type: [ruleConditionSchema],
      validate: [(conditions) => conditions.length > 0, 'At least one condition is required'],
    },
    action: { type: ruleActionSchema, required: true },
    redirectTarget: { type: String, default: '/tasks' },
    isActive: { type: Boolean, default: true, index: true },
    cooldownMinutes: { type: Number, default: 60, min: 0 },
    lastTriggeredAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

ruleSchema.index({ tenantId: 1, isActive: 1, trigger: 1 });

ruleSchema.pre('validate', function normalizeRule(next) {
  if (this.trigger === 'manual') {
    this.trigger = 'scheduled';
  }
  this.roles = (this.roles || []).map((role) => normalizeRole(role, role));
  this.conditions = (this.conditions || []).map((condition) => {
    const conditionObject = condition.toObject?.() || condition;
    return { ...conditionObject };
  });
  next();
});

export default mongoose.model('Rule', ruleSchema);
