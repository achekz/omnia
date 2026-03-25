import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done', 'overdue'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    dueDate: { type: Date },
    completedAt: { type: Date },
    tags: [{ type: String }],
    estimatedMinutes: { type: Number },
    actualMinutes: { type: Number },
  },
  { timestamps: true }
);

taskSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
