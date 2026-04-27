import { normalizeRole } from "../utils/roleNormalization.js";

export const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedUserRole = normalizeRole(req.user?.role, req.user?.role);
    const normalizedRoles = roles.map((role) => normalizeRole(role, role));

    if (!normalizedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
