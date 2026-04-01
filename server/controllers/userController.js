import User from '../models/User.js';
import { ApiError, ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllUsers } from "../services/userService.js";


// GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  return res.json(new ApiResponse(200, { user }));
});

// PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'avatar', 'preferences'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
    .select('-password -refreshToken');

  return res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

// GET /api/users (tenant)
export const listUsers = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new ApiError(403, 'Tenant required');

  const users = await User.find({ tenantId: req.tenantId })
    .select('-password -refreshToken');

  return res.json(new ApiResponse(200, { users }));
});

// 🔥 NEW (simple version)
export const getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

export const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
};