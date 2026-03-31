import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, profileType, orgName } = req.body;

  if (!name || !email || !password || !profileType) {
    throw new ApiError(400, 'name, email, password and profileType are required');
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  // 🟢 NEW: profileType → role (RBAC)
  let role = 'user';

  if (profileType === 'company' || profileType === 'cabinet') {
    role = 'admin';
  } else if (profileType === 'manager') {
    role = 'manager';
  }

  let tenantId = null;
  let org = null;

  if (profileType === 'company' || profileType === 'cabinet') {
    if (!orgName) throw new ApiError(400, 'orgName is required for company/cabinet');

    org = await Organization.create({
      name: orgName,
      type: profileType,
    });

    tenantId = org._id;
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    profileType,
    tenantId,
  });

  if (org) {
    org.ownerId = user._id;
    org.members.push(user._id);
    await org.save();
  }

  // Generate tokens
  let accessToken, refreshToken;

  try {
    accessToken = user.generateAccessToken();
    refreshToken = user.generateRefreshToken();
  } catch (err) {
    throw new ApiError(500, 'Token generation failed');
  }

  user.refreshToken = refreshToken;
  await user.save();

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileType: user.profileType,
          tenantId: user.tenantId,
          avatar: user.avatar,
          preferences: user.preferences,
        },
        accessToken,
        refreshToken,
      },
      'Registered successfully'
    )
  );
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const match = await user.comparePassword(password);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  if (!user.isActive) throw new ApiError(403, 'Account deactivated');

  user.lastLogin = new Date();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  // ✅ IMPORTANT: always return response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileType: user.profileType,
          tenantId: user.tenantId,
          avatar: user.avatar,
          preferences: user.preferences,
        },
        accessToken,
        refreshToken,
      },
      'Login successful'
    )
  );
});

// POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) throw new ApiError(400, 'Refresh token required');

  let decoded;

  try {
    const jwt = (await import('jsonwebtoken')).default;
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findOne({
    _id: decoded.id,
    refreshToken: token,
  });

  if (!user) throw new ApiError(401, 'Invalid refresh token');

  const accessToken = user.generateAccessToken();

  return res.json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  return res.json(new ApiResponse(200, {}, 'Logged out'));
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');

  let orgName = null;

  if (user.tenantId) {
    const { default: Organization } = await import('../models/Organization.js');
    const org = await Organization.findById(user.tenantId).select('name');
    orgName = org?.name || null;
  }

  return res.json(new ApiResponse(200, { user, orgName }));
});