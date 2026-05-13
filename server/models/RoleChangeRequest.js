// Role du fichier: definit les demandes de changement de role.
import mongoose from "mongoose";
import { getAllowedRoles, normalizeRole } from "../utils/roleNormalization.js";

const { Schema } = mongoose;

const requestStatuses = ["pending", "approved", "rejected"];

const roleChangeRequestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    currentRole: {
      type: String,
      enum: getAllowedRoles(),
      required: true,
    },
    requestedRole: {
      type: String,
      enum: getAllowedRoles(),
      required: true,
    },
    status: {
      type: String,
      enum: requestStatuses,
      default: "pending",
      index: true,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

roleChangeRequestSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

roleChangeRequestSchema.pre("validate", function normalizeRequestRoles(next) {
  this.currentRole = normalizeRole(this.currentRole, "employee");
  this.requestedRole = normalizeRole(this.requestedRole, "employee");
  next();
});

export default mongoose.model("RoleChangeRequest", roleChangeRequestSchema);
