import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const emailVerificationCodeSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "employee", "accountant"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
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
  },
  {
    timestamps: true,
  },
);

emailVerificationCodeSchema.methods.setCode = async function setCode(code) {
  const salt = await bcrypt.genSalt(10);
  this.codeHash = await bcrypt.hash(code, salt);
};

emailVerificationCodeSchema.methods.compareCode = async function compareCode(code) {
  return bcrypt.compare(code, this.codeHash);
};

export default mongoose.model("EmailVerificationCode", emailVerificationCodeSchema);
