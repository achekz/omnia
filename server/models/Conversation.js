// Role du fichier: definit le schema MongoDB et la structure des donnees.
import mongoose from "mongoose";

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", index: true },
    conversationId: { type: String, required: true, trim: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    attachments: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
    collection: "conversations",
  },
);

conversationSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });

export default mongoose.model("Conversation", conversationSchema);
