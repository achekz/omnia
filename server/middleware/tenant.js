import { ApiError } from '../utils/ApiResponse.js';

export const tenantIsolation = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  req.tenantId = req.user.tenantId || null;
  next();
};
