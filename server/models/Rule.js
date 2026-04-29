import mongoose from 'mongoose';

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
        'finance.expensesThisMonth',
        'finance.balanceThisMonth',
        'finance.recordAmount',
        'student.examDueDays',
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
      enum: ['scheduled', 'task', 'finance', 'manual'],
      default: 'scheduled',
      index: true,
    },
    resource: {
      type: String,
      enum: ['task', 'finance', 'student'],
      required: true,
    },
    roles: [{ type: String }],
    conditions: {
      type: [ruleConditionSchema],
      validate: [(conditions) => conditions.length > 0, 'At least one condition is required'],
    },
    action: { type: ruleActionSchema, required: true },
    isActive: { type: Boolean, default: true, index: true },
    cooldownMinutes: { type: Number, default: 60, min: 0 },
    lastTriggeredAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

ruleSchema.index({ tenantId: 1, isActive: 1, trigger: 1 });

export default mongoose.model('Rule', ruleSchema);
