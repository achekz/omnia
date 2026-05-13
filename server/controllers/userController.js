// Role du fichier: contient la logique backend des requetes et reponses API.
import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllUsers } from "../services/userService.js";
import { createAndSendVerificationCode, verifyOtpCode } from "../services/verificationCodeService.js";

// GET profile
// Role: Recupere les donnees necessaires.
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  return res.json(new ApiResponse(200, { user }));
});

// UPDATE profile
// Role: Enregistre une modification.
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
// Role: Envoie un message ou une notification.
export const sendEmailVerificationCode = asyncHandler(async (req, res) => {
  const { newEmail, currentPassword } = req.body;

  if (!newEmail || !newEmail.includes('@')) {
    throw new ApiError(400, 'Invalid email format');
  }

  const user = await User.findById(req.user._id).select('+password');
  const passwordOk = user && await user.comparePassword(String(currentPassword || ''));
  if (!passwordOk) {
    throw new ApiError(403, 'Current password is incorrect');
  }

  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser) {
    throw new ApiError(400, 'Email already in use');
  }

  const result = await createAndSendVerificationCode({
    purpose: 'account-email-change',
    type: 'account_security',
    email: newEmail,
    firstName: user.firstName,
    role: user.role,
    profileType: user.profileType,
    allowDeliveryFailure: process.env.NODE_ENV !== 'production',
  });

  user.pendingEmail = newEmail;
  await user.save();

  return res.json(new ApiResponse(200, { expiresAt: result.expiresAt, devCode: result.code }, 'Verification code sent'));
});

// Verify email change
// Role: Verifie les donnees ou les droits.
export const verifyEmailChange = asyncHandler(async (req, res) => {
  const { newEmail, code } = req.body;

  const user = await User.findById(req.user._id).select('+pendingEmail');

  if (user.pendingEmail !== newEmail) {
    throw new ApiError(400, 'Email mismatch');
  }

  const result = await verifyOtpCode({
    purpose: 'account-email-change',
    email: newEmail,
    code,
  });

  if (!result.verified) {
    throw new ApiError(400, result.reason || 'Invalid verification code');
  }

  result.verification.consumedAt = new Date();
  await result.verification.save();

  const updatedUser = await User.findByIdAndUpdate(req.user._id, {
    email: newEmail,
    emailVerificationCode: undefined,
    emailVerificationCodeExpiry: undefined,
    pendingEmail: undefined
  }, { new: true }).select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user: updatedUser }, 'Email updated successfully'));
});

// Update notification preferences
// Role: Enregistre une modification.
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
// Role: Enregistre une modification.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, code } = req.body;

  if (!currentPassword || !newPassword || !code) {
    throw new ApiError(400, 'Current password, new password and verification code are required');
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

  const result = await verifyOtpCode({
    purpose: 'account-password-change',
    email: user.email,
    code,
  });

  if (!result.verified) {
    throw new ApiError(400, result.reason || 'Invalid verification code');
  }

  result.verification.consumedAt = new Date();
  await result.verification.save();

  // Update password
  user.password = newPassword;
  await user.save();

  const updatedUser = await User.findById(req.user._id).select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user: updatedUser }, 'Password updated successfully'));
});

// Role: Envoie un message ou une notification.
export const sendPasswordChangeCode = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  const passwordOk = await user.comparePassword(currentPassword);
  if (!passwordOk) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(400, 'Password must contain at least 6 characters');
  }

  const result = await createAndSendVerificationCode({
    purpose: 'account-password-change',
    type: 'account_security',
    email: user.email,
    firstName: user.firstName,
    role: user.role,
    profileType: user.profileType,
    allowDeliveryFailure: process.env.NODE_ENV !== 'production',
  });

  return res.json(new ApiResponse(200, { expiresAt: result.expiresAt, devCode: result.code }, 'Verification code sent'));
});

// GET users (tenant)
// Role: Recupere les donnees necessaires.
export const listUsers = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');

  const users = await User.find({ tenantId: req.tenantId })
    .select('-password -refreshToken');

  return res.json(new ApiResponse(200, { users }));
});

// 🔥 ADMIN ONLY
// Role: Recupere les donnees necessaires.
export const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
};
