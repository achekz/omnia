import { ApiError } from '../utils/ApiResponse.js';

// Multi-Tenant Isolation Middleware - CRITICAL SECURITY
export const requireTenant = (req, res, next) => {
  // Attach tenantId to req for all queries
  if (!req.user || !req.user.tenantId) {
    console.log('[TENANT] No tenantId - access denied');
    return res.status(403).json(new ApiError(403, 'Tenant access denied'));
  }

  req.tenantId = req.user.tenantId;
  console.log(`[TENANT] Setting tenantId: ${req.tenantId} for user ${req.user.email}`);
  next();
};

// Query Helper - automatically adds tenant filter
export const withTenantFilter = (model) => async (queryObj, options = {}) => {
  const tenantFilter = { tenantId: options.tenantId || model.tenantId };
  return await model.find({ ...queryObj, ...tenantFilter }, null, options);
};
