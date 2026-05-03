const canonicalRoles = ["admin", "employee", "stagiaire", "comptable"];
const legacyRoleAliases = {
  accountant: "comptable",
  accounting: "comptable",
  company_admin: "admin",
  cabinet_admin: "admin",
  manager: "admin",
  company: "admin",
  cabinet: "comptable",
  enterprise: "admin",
  entreprise: "admin",
  user: "employee",
  intern: "stagiaire",
  employe: "employee",
  employé: "employee",
  rh: "employee",
  hr: "employee",
};

function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeRole(value, fallback = "employee") {
  const normalized = normalizeRoleKey(value);
  const fallbackValue = normalizeRoleKey(fallback);
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

export function getLegacyRoleAliases() {
  return { ...legacyRoleAliases };
}
