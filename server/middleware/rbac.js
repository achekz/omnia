import { ApiError } from '../utils/ApiResponse.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Insufficient permissions. Required: ${allowedRoles.join(', ')}`
      );
    }
    next();
  };
};
