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

export default mongoose.model("Recommendation", recommendationSchema);
