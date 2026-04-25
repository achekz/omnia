import mongoose from "mongoose";

const { Schema } = mongoose;

const performanceLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    delayedTasks: {
      type: Number,
      default: 0,
    },
    executionMinutes: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "performanceLogs",
  },
);

performanceLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("PerformanceLog", performanceLogSchema);
