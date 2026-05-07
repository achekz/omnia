import mongoose from "mongoose";

const { Schema } = mongoose;

const recommendationSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
    generatedFor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    generatedBy: {
      type: String,
      default: "system",
    },
    kind: {
      type: String,
      enum: ["general", "weekly_effectiveness"],
      default: "general",
      index: true,
    },
    weekKey: {
      type: String,
      trim: true,
      index: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    windowEnd: {
      type: Date,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    recommendations: {
      type: [String],
      default: [],
    },
    ranking: {
      type: Number,
      default: null,
    },
    score: {
      type: Number,
      default: null,
    },
    effectiveUser: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      role: String,
      score: Number,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "recommendations",
  },
);

recommendationSchema.index({ tenantId: 1, kind: 1, weekKey: 1 });
recommendationSchema.index({ tenantId: 1, kind: 1, createdAt: -1 });

export default mongoose.model("Recommendation", recommendationSchema);
