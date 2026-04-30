import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'overdue', 'declined'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    priorityScore: { type: Number, default: 2, min: 1, max: 100 },
    delayDays: { type: Number, default: 0, min: 0 },
    plannedStartAt: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    actualStartedAt: { type: Date },
    actualFinishedAt: { type: Date },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    declineReason: { type: String, trim: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDelayed: { type: Boolean, default: false },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    dueDate: { type: Date },
    completedAt: { type: Date },
    tags: [{ type: String }],
    estimatedMinutes: { type: Number },
    estimatedDurationMinutes: { type: Number },
    actualMinutes: { type: Number },
  },
  { timestamps: true }
);

taskSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });

taskSchema.pre('save', function planAndScoreTask(next) {
  const basePriority = { low: 1, medium: 2, high: 3, critical: 4 }[this.priority] || 2;
  const now = new Date();

  if (this.dueDate && this.dueDate < now && !['done', 'declined'].includes(this.status)) {
    this.delayDays = Math.floor((now.getTime() - this.dueDate.getTime()) / (24 * 60 * 60 * 1000));
    this.status = this.status === 'todo' || this.status === 'in_progress' ? 'overdue' : this.status;
  } else {
    this.delayDays = 0;
  }

  const urgencyBoost = this.dueDate
    ? Math.max(0, 7 - Math.ceil((this.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  this.priorityScore = Math.min(100, basePriority * 20 + urgencyBoost * 5 + this.delayDays * 10);

  if (!this.plannedStartAt && this.dueDate && this.estimatedMinutes) {
    this.plannedStartAt = new Date(this.dueDate.getTime() - Math.max(this.estimatedMinutes, 30) * 60 * 1000);
  }

  if (!this.startTime && this.plannedStartAt) {
    this.startTime = this.plannedStartAt;
  }

  if (!this.estimatedMinutes && this.estimatedDurationMinutes) {
    this.estimatedMinutes = this.estimatedDurationMinutes;
  }

  if (!this.estimatedDurationMinutes && this.estimatedMinutes) {
    this.estimatedDurationMinutes = this.estimatedMinutes;
  }

  if (this.startTime && this.estimatedMinutes && !this.endTime) {
    this.endTime = new Date(this.startTime.getTime() + this.estimatedMinutes * 60 * 1000);
  }

  if (this.actualFinishedAt && this.endTime) {
    this.isDelayed = this.actualFinishedAt.getTime() > this.endTime.getTime();
  }

  next();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
