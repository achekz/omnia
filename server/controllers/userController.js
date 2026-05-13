// Role du fichier: contient la logique backend des requetes et reponses API.
import User from '../models/User.js';
import RoleChangeRequest from '../models/RoleChangeRequest.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllUsers } from "../services/userService.js";
import { createAndSendVerificationCode, verifyOtpCode } from "../services/verificationCodeService.js";
import { normalizeRole } from "../utils/roleNormalization.js";
import * as notifService from "../services/notifService.js";

const userRequestRoles = ["employee", "stagiaire", "comptable"];

// Role: Construit des donnees derivees.
function buildTenantFilter(user) {
  return user?.tenantId ? { tenantId: user.tenantId } : {};
}

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

// Role: Envoie un message ou une notification.
export const sendRoleChangeCode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const requestedRole = normalizeRole(req.body.requestedRole, "");
  const currentRole = normalizeRole(user.role || user.profileType, "employee");

  if (!userRequestRoles.includes(requestedRole)) {
    throw new ApiError(400, "Requested role is not allowed");
  }

  if (requestedRole === currentRole) {
    throw new ApiError(400, "Requested role must be different from current role");
  }

  const result = await createAndSendVerificationCode({
    purpose: "account-role-change",
    type: "account_security",
    email: user.email,
    firstName: user.firstName,
    role: currentRole,
    profileType: currentRole,
    allowDeliveryFailure: process.env.NODE_ENV !== "production",
  });

  return res.json(new ApiResponse(200, { expiresAt: result.expiresAt, devCode: result.code }, "Verification code sent"));
});

// Role: Cree une nouvelle ressource.
export const requestRoleChange = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const requestedRole = normalizeRole(req.body.requestedRole, "");
  const currentRole = normalizeRole(user.role || user.profileType, "employee");
  const code = String(req.body.code || "").trim();

  if (!userRequestRoles.includes(requestedRole)) {
    throw new ApiError(400, "Requested role is not allowed");
  }

  if (requestedRole === currentRole) {
    throw new ApiError(400, "Requested role must be different from current role");
  }

  if (!code) {
    throw new ApiError(400, "Verification code is required");
  }

  const verification = await verifyOtpCode({
    purpose: "account-role-change",
    email: user.email,
    code,
  });

  if (!verification.verified) {
    throw new ApiError(400, verification.reason || "Invalid verification code");
  }

  verification.verification.consumedAt = new Date();
  await verification.verification.save();

  await RoleChangeRequest.deleteMany({ userId: user._id, status: "pending" });

  const request = await RoleChangeRequest.create({
    userId: user._id,
    tenantId: user.tenantId || null,
    currentRole,
    requestedRole,
    status: "pending",
  });

  const adminFilter = user.tenantId
    ? { $or: [{ role: "admin", tenantId: user.tenantId }, { role: "admin", tenantId: { $exists: false } }, { role: "admin", tenantId: null }] }
    : { role: "admin" };
  const admins = await User.find(adminFilter).select("_id tenantId");

  await Promise.all(
    admins.map((admin) =>
      notifService.create(admin._id, admin.tenantId || user.tenantId || null, {
        type: "warning",
        title: "Demande de changement de rôle",
        message: `${user.name || user.email} demande le rôle ${requestedRole}.`,
        source: "user",
        actionUrl: "/admin/users",
        metadata: {
          roleChangeRequestId: request._id.toString(),
          userId: user._id.toString(),
          requestedRole,
        },
      }),
    ),
  );

  return res.status(201).json(new ApiResponse(201, { request }, "Role change request sent"));
});

// Role: Recupere les donnees necessaires.
export const getOwnRoleChangeRequest = asyncHandler(async (req, res) => {
  const request = await RoleChangeRequest.findOne({
    userId: req.user._id,
    ...buildTenantFilter(req.user),
  })
    .sort({ createdAt: -1 })
    .populate("userId", "name firstName lastName email role profileType");

  return res.json(new ApiResponse(200, { request }, "Role change request retrieved"));
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
