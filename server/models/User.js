import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAllowedRoles, normalizeProfileType, normalizeRole } from "../utils/roleNormalization.js";

const { Schema } = mongoose;

const allowedRoles = getAllowedRoles();
const allowedGenders = ["male", "female"];

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    city: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: allowedRoles,
      required: true,
    },
    profileType: {
      type: String,
      enum: allowedRoles,
      required: true,
    },
    verificationMethod: {
      type: String,
      enum: ["email"],
      default: "email",
    },
    gender: {
      type: String,
      enum: allowedGenders,
      default: "male",
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    preferences: {
      theme: { type: String, default: "light" },
      emailNotifications: { type: Boolean, default: true },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      inAppMentions: { type: Boolean, default: true },
      taskUpdates: { type: Boolean, default: true },
      aiInsights: { type: Boolean, default: true },
      marketingUpdates: { type: Boolean, default: false },
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationCodeExpiry: {
      type: Date,
      select: false,
    },
    pendingEmail: {
      type: String,
      select: false,
    },
    resetCode: {
      type: String,
      select: false,
    },
    resetCodeExpire: {
      type: Date,
      select: false,
    },
    resetCodeVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual("fullName").get(function getFullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.pre("save", async function hashPassword(next) {
  this.name = `${this.firstName} ${this.lastName}`.trim();
  this.role = normalizeRole(this.role, "employee");
  this.profileType = normalizeProfileType(this.profileType || this.role, "employee");

  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
  const normalizedRole = normalizeRole(this.role, "employee");
  const normalizedProfileType = normalizeProfileType(this.profileType, "employee");

  return jwt.sign(
    {
      id: this._id,
      role: normalizedRole,
      profileType: normalizedProfileType,
      aiProfile: normalizedRole,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "15m" },
  );
};

userSchema.methods.generateRefreshToken = function generateRefreshToken() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" },
  );
};

export default mongoose.model("User", userSchema);
