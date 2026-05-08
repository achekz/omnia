// Role du fichier: fournit des fonctions utilitaires partagees.
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

// Role: Prepare une valeur pour l affichage ou l API.
function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Role: Prepare une valeur pour l affichage ou l API.
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

// Role: Prepare une valeur pour l affichage ou l API.
export function normalizeProfileType(value, fallback = "employee") {
  return normalizeRole(value, fallback);
}

// Role: Retourne un etat booleen.
export function isEmployeeLikeRole(value) {
  return ["employee", "stagiaire", "comptable"].includes(normalizeRole(value));
}

// Role: Recupere les donnees necessaires.
export function getAllowedRoles() {
  return [...canonicalRoles];
}

// Role: Recupere les donnees necessaires.
export function getLegacyRoleAliases() {
  return { ...legacyRoleAliases };
}
