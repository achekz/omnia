import mongoose from "mongoose";

const { Schema } = mongoose;

const kpiSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: Number, required: true, default: 0 },
    unit: { type: String, trim: true, default: "" },
    trend: { type: String, enum: ["up", "down", "stable"], default: "stable" },
    status: { type: String, enum: ["good", "warning", "critical", "neutral"], default: "neutral" },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const analysisSchema = new Schema(
  {
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    metric: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const recommendationItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    source: { type: String, trim: true, default: "system" },
  },
  { _id: false },
);

const insightSnapshotSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    generatedBy: { type: String, default: "system" },
    generatedForRole: { type: String, trim: true, default: "all" },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    kpis: { type: [kpiSchema], default: [] },
    analysis: { type: [analysisSchema], default: [] },
    recommendations: { type: [recommendationItemSchema], default: [] },
    summary: { type: String, trim: true, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "insightSnapshots",
  },
);

insightSnapshotSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("InsightSnapshot", insightSnapshotSchema);
