// Role du fichier: definit le schema MongoDB et la structure des donnees.
import mongoose from "mongoose";

const { Schema } = mongoose;

const presenceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "very_late"],
      required: true,
      index: true,
    },
    delayMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "presences",
  },
);

presenceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
presenceSchema.index({ tenantId: 1, date: 1 });
presenceSchema.index({ tenantId: 1, status: 1, date: -1 });

export default mongoose.model("Presence", presenceSchema);
