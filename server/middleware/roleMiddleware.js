import { ApiResponse } from '../utils/ApiResponse.js';

// Production RBAC Middleware with logging
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated and has required role
    if (!req.user) {
      console.log('[RBAC] Unauthorized access attempt');
      return res.status(401).json(new ApiResponse(401, null, 'Not authenticated'));
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`[RBAC] Access denied for role '${req.user.role}'. Required: [${roles.join(', ')}]');
      return res.status(403).json(new ApiResponse(403, null, 'Access denied - insufficient permissions'));
    }

    console.log(`[RBAC] Access granted for role: ${req.user.role}`);
    next();
  };
};

// Role hierarchy check (ADMIN > MANAGER > EMPLOYEE)
export const hasHigherRole = (requiredRole) => {
  const hierarchy = {
    'ADMIN': 5,
    'MANAGER': 4,
    'ACCOUNTANT': 3,
    'EMPLOYEE': 2,
    'STUDENT': 1,
    'USER': 0
  };
  
  return (req, res, next) => {
    if (!req.user || hierarchy[req.user.role] < hierarchy[requiredRole]) {
      return res.status(403).json(new ApiResponse(403, null, 'Insufficient role hierarchy'));
    }
    next();
  };
};
