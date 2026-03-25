import mongoose from 'mongoose';

const { Schema } = mongoose;

const activityLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId },
    date: { type: Date, required: true },
    tasksCompleted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    activeMinutes: { type: Number, default: 0 },
    loginCount: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 },
    score: { type: Number, default: 0, min: 0, max: 100 },
    studyHours: { type: Number },
    budgetSpent: { type: Number },
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1, date: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
