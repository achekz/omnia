import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllUsers } from "../services/userService.js";
import { sendEmailVerificationCode as sendVerificationEmail } from "../services/emailService.js";

// GET profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  return res.json(new ApiResponse(200, { user }));
});

// UPDATE profile
export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'avatar', 'preferences', 'isPublic'];
  const updates = {};

  allowed.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
    .select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

// Send email verification code
export const sendEmailVerificationCode = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;

  if (!newEmail || !newEmail.includes('@')) {
    throw new ApiError(400, 'Invalid email format');
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser) {
    throw new ApiError(400, 'Email already in use');
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save code temporarily
  await User.findByIdAndUpdate(req.user._id, {
    emailVerificationCode: code,
    emailVerificationCodeExpiry: expiryTime,
    pendingEmail: newEmail
  });

  // Send email with code
  try {
    await sendVerificationEmail(newEmail, code);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new ApiError(500, 'Failed to send verification email');
  }

  return res.json(new ApiResponse(200, {}, 'Verification code sent'));
});

// Verify email change
export const verifyEmailChange = asyncHandler(async (req, res) => {
  const { newEmail, code } = req.body;

  const user = await User.findById(req.user._id).select('+emailVerificationCode +emailVerificationCodeExpiry');

  if (!user.emailVerificationCode || !user.emailVerificationCodeExpiry) {
    throw new ApiError(400, 'No pending email verification');
  }

  // Check if code expired
  if (new Date() > user.emailVerificationCodeExpiry) {
    await User.findByIdAndUpdate(req.user._id, {
      emailVerificationCode: undefined,
      emailVerificationCodeExpiry: undefined,
      pendingEmail: undefined
    });
    throw new ApiError(400, 'Verification code expired');
  }

  // Check if code matches
  if (user.emailVerificationCode !== code) {
    throw new ApiError(400, 'Invalid verification code');
  }

  // Check if new email matches pending email
  if (user.pendingEmail !== newEmail) {
    throw new ApiError(400, 'Email mismatch');
  }

  // Update email
  const updatedUser = await User.findByIdAndUpdate(req.user._id, {
    email: newEmail,
    emailVerificationCode: undefined,
    emailVerificationCodeExpiry: undefined,
    pendingEmail: undefined
  }, { new: true }).select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user: updatedUser }, 'Email updated successfully'));
});

// Update notification preferences
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const allowed = ['emailNotifications', 'inAppMentions', 'taskUpdates', 'aiInsights', 'marketingUpdates'];
  const updates = { notificationPreferences: {} };

  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.notificationPreferences[f] = req.body[f];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id, 
    updates, 
    { new: true }
  ).select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user }, 'Notification preferences updated'));
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Compare current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Check if new password is same as old
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  const updatedUser = await User.findById(req.user._id).select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user: updatedUser }, 'Password updated successfully'));
});

// GET users (tenant)
export const listUsers = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');

  const users = await User.find({ tenantId: req.tenantId })
    .select('-password -refreshToken');

  return res.json(new ApiResponse(200, { users }));
});

// 🔥 ADMIN ONLY
export const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
};