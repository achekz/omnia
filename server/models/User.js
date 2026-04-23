import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'STUDENT', 'ACCOUNTANT', 'USER', 'COMPANY_ADMIN', 'CABINET_ADMIN'],
      default: 'EMPLOYEE'
    },

    profileType: {
      type: String,
      enum: ['company', 'cabinet', 'employee', 'student'],
      required: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      required: false
    },

    avatar: { type: String, default: '' },

    isActive: { type: Boolean, default: true },

    lastLogin: { type: Date },

    refreshToken: { type: String, select: false },

    preferences: {
      theme: { type: String, default: 'dark' },
      emailNotifications: { type: Boolean, default: true },
    },

    isPublic: { type: Boolean, default: false },

    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      inAppMentions: { type: Boolean, default: true },
      taskUpdates: { type: Boolean, default: true },
      aiInsights: { type: Boolean, default: true },
      marketingUpdates: { type: Boolean, default: false },
    },

    emailVerificationCode: String,
    emailVerificationCodeExpiry: Date,
    pendingEmail: String,
  },
  { timestamps: true }
);

// 🔐 HASH PASSWORD
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 COMPARE PASSWORD
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔐 ACCESS TOKEN
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      tenantId: this.tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// 🔄 REFRESH TOKEN
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

export default mongoose.model('User', userSchema);
