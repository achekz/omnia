const canonicalRoles = ["admin", "employee", "stagiaire", "comptable"];

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

  if (["intern", "student", "étudiant", "etudiant", "stagiaire"].includes(normalized)) {
    return "stagiaire";
  }

  if (["employee", "employé", "employe", "rh", "hr"].includes(normalized)) {
    return "employee";
  }

  return canonicalRoles.includes(normalized) ? normalized : fallback;
}

export function normalizeProfileType(value, fallback = "employee") {
  return normalizeRole(value, fallback);
}

export function isEmployeeLikeRole(value) {
  return ["employee", "stagiaire"].includes(normalizeRole(value));
}

export function getAllowedRoles() {
  return [...canonicalRoles];
}
