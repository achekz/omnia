export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const normalizedRequiredRoles = roles.map((role) => String(role).toLowerCase());
    const normalizedUserRole = String(req.user.role || "").toLowerCase();

    console.log("[RBAC] Required roles:", normalizedRequiredRoles);

    if (!normalizedRequiredRoles.includes(normalizedUserRole)) {
      console.log("[RBAC] Access denied for role:", req.user.role);
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("[RBAC] Access granted for role:", req.user.role);

    next();
  };
};
