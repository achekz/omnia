const canonicalRoles = ["admin", "entreprise", "employee", "comptable", "stagiaire", "student"];

export function normalizeRole(value, fallback = "employee") {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (normalized === "accountant") {
    return "comptable";
  }

  if (["company_admin", "cabinet_admin", "manager", "enterprise", "entreprise"].includes(normalized)) {
    return "admin";
  }

  if (normalized === "intern") {
    return "stagiaire";
  }

  if (normalized === "rh" || normalized === "hr") {
    return "employee";
  }

  return canonicalRoles.includes(normalized) ? normalized : fallback;
}

export function normalizeProfileType(value, fallback = "employee") {
  const normalized = normalizeRole(value, fallback);
  return normalized === "stagiaire" ? "employee" : normalized;
}

export function isEmployeeLikeRole(value) {
  return ["employee", "stagiaire", "student"].includes(normalizeRole(value));
}

export function getAllowedRoles() {
  return [...canonicalRoles];
}
