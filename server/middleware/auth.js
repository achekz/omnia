// Role du fichier: filtre ou enrichit les requetes avant les controleurs.
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeProfileType, normalizeRole } from '../utils/roleNormalization.js';

// Role: Decrit la logique attachCanonicalRole.
function attachCanonicalRole(user) {
  const role = normalizeRole(user.role || user.profileType, 'employee');
  const profileType = normalizeProfileType(user.profileType || role, role);

  user.role = role;
  user.profileType = profileType;
  return user;
}

// Role: Decrit la logique protect.
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(decoded.id).select('-password');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found');
  }

  req.auth = decoded;
  req.user = attachCanonicalRole(user);
  next();
});

// Role: Decrit la logique optionalAuth.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("[AUTH] Optional auth failed:", error.message);
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database is not connected. Authenticated AI requests need MongoDB context.");
  }

  const user = await User.findById(decoded.id).select("-password");

  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found");
  }

  req.auth = decoded;
  req.user = attachCanonicalRole(user);

  next();
});
