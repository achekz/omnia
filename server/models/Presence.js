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
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    verificationMethod: {
      type: String,
      enum: ["email", "sms", "whatsapp"],
      required: true,
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    lateReason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "presence",
  },
);

export default mongoose.model("Presence", presenceSchema);
