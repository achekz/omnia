// Role du fichier: filtre ou enrichit les requetes avant les controleurs.
import { normalizeRole } from "../utils/roleNormalization.js";

// Role: Decrit la logique authorize.
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const normalizedRequiredRoles = roles.map((role) => normalizeRole(role, role));
    const normalizedUserRole = normalizeRole(req.user.role || req.user.profileType, "");

    console.log("[RBAC] Required roles:", normalizedRequiredRoles);

    if (!normalizedRequiredRoles.includes(normalizedUserRole)) {
      console.log("[RBAC] Access denied for role:", req.user.role);
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("[RBAC] Access granted for role:", req.user.role);

    next();
  };
};
