// Role du fichier: definit le schema MongoDB et la structure des donnees.
import mongoose from "mongoose";

const { Schema } = mongoose;

const ruleExecutionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    ruleId: { type: Schema.Types.ObjectId, ref: "Rule", required: true, index: true },
    ruleName: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true, index: true },
    result: { type: Schema.Types.Mixed, required: true },
    triggeredAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: "ruleExecutions",
  },
);

ruleExecutionSchema.index({ tenantId: 1, triggeredAt: -1 });

export default mongoose.model("RuleExecution", ruleExecutionSchema);
