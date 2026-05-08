// Role du fichier: filtre ou enrichit les requetes avant les controleurs.
import { normalizeRole } from '../utils/roleNormalization.js';
import { ApiError } from '../utils/ApiResponse.js';

// Role: Decrit la logique tenantIsolation.
export const tenantIsolation = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  // L'admin voit tout — pas d'isolation par tenant
  if (req.user.role === 'admin') {
    req.tenantId = null;
    return next();
  }
  req.tenantId = req.user.tenantId || null;
  next();
};