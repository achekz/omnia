const canonicalRoles = ["admin", "employee", "stagiaire", "comptable"];
const legacyRoleAliases = {
  accountant: "comptable",
  company_admin: "admin",
  cabinet_admin: "admin",
  manager: "admin",
  enterprise: "admin",
  entreprise: "admin",
  intern: "stagiaire",
  student: "stagiaire",
  etudiant: "stagiaire",
  étudiant: "stagiaire",
  employe: "employee",
  employé: "employee",
  rh: "employee",
  hr: "employee",
};

export function normalizeRole(value, fallback = "employee") {
  const normalized = String(value || "").trim().toLowerCase();
  const fallbackValue = String(fallback ?? "").trim().toLowerCase();
  const normalizedFallback = canonicalRoles.includes(fallbackValue) ? fallbackValue : fallback;

  if (!normalized) {
    return normalizedFallback;
  }

  if (canonicalRoles.includes(normalized)) {
    return normalized;
  }

  return legacyRoleAliases[normalized] || normalizedFallback;
}

export function normalizeProfileType(value, fallback = "employee") {
  return normalizeRole(value, fallback);
}

export function isEmployeeLikeRole(value) {
  return ["employee", "stagiaire", "comptable"].includes(normalizeRole(value));
}

export function getAllowedRoles() {
  return [...canonicalRoles];
}
