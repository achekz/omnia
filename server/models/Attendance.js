import mongoose from "mongoose";

const { Schema } = mongoose;

const attendanceSchema = new Schema(
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
      required: true,
    },
    checkOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["on_time", "late", "very_late"],
      required: true,
      index: true,
    },
    checkOutStatus: {
      type: String,
      enum: ["on_time", "early", "very_early"],
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
    checkOutReason: {
      type: String,
      trim: true,
      default: "",
    },
    userSnapshot: {
      name: { type: String, trim: true, default: "" },
      firstName: { type: String, trim: true, default: "" },
      lastName: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      role: { type: String, trim: true, default: "" },
      profileType: { type: String, trim: true, default: "" },
    },
  },
  {
    timestamps: true,
  },
);

attendanceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: 1, checkIn: 1 });

export default mongoose.model("Attendance", attendanceSchema);
