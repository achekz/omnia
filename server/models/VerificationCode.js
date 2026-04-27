import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getAllowedRoles, normalizeRole } from "../utils/roleNormalization.js";

const { Schema } = mongoose;

const verificationCodeSchema = new Schema(
  {
    purpose: {
      type: String,
      enum: ["register", "presence", "reset-password"],
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      trim: true,
    },
    verificationMethod: {
      type: String,
      enum: ["email", "sms", "whatsapp"],
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: getAllowedRoles(),
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "verificationCodes",
  },
);

verificationCodeSchema.methods.setCode = async function setCode(code) {
  this.role = normalizeRole(this.role, "employee");
  const salt = await bcrypt.genSalt(10);
  this.codeHash = await bcrypt.hash(code, salt);
};

verificationCodeSchema.methods.compareCode = async function compareCode(code) {
  return bcrypt.compare(code, this.codeHash);
};

export default mongoose.model("VerificationCode", verificationCodeSchema);
