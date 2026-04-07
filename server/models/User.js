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
      enum: ['admin', 'user', 'manager', 'company_admin', 'cabinet_admin'],
      default: 'user',
    },

    profileType: {
      type: String,
      enum: ['company', 'cabinet', 'employee', 'student'],
      required: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },

    avatar: { type: String, default: '' },

    isActive: { type: Boolean, default: true },

    lastLogin: { type: Date },

    refreshToken: { type: String },

    preferences: {
      theme: { type: String, default: 'dark' },
      emailNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);


// ✅ HASH PASSWORD BEFORE SAVE (clean & safe)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});


// ✅ INDEX (keep one only)
userSchema.index({ email: 1 });


// ✅ COMPARE PASSWORD (robust)
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error('❌ Password compare error:', err);
    return false;
  }
};


// ✅ ACCESS TOKEN
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};


// ✅ REFRESH TOKEN
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};


const User = mongoose.model('User', userSchema);
export default User;