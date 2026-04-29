const canonicalRoles = ["admin", "entreprise", "employee", "comptable", "stagiaire"];

export function normalizeRole(value, fallback = "employee") {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return fallback;

  if (normalized === "accountant") return "comptable";

  if (["company_admin", "cabinet_admin", "manager", "enterprise", "entreprise"].includes(normalized)) {
    return "admin";
  }

  if (normalized === "intern") return "stagiaire";

  if (normalized === "rh" || normalized === "hr") return "employee";

  return canonicalRoles.includes(normalized) ? normalized : fallback;
}

// ❌ قبل: كان يحوّل stagiaire → employee
// ✅ توّا: نحافظو عليه
export function normalizeProfileType(value, fallback = "employee") {
  return normalizeRole(value, fallback);
}

// ❌ قبل: stagiaire محسوب employee
// ✅ توّا: لا
export function isEmployeeLikeRole(value) {
  return ["employee"].includes(normalizeRole(value));
}

export function getAllowedRoles() {
  return [...canonicalRoles];
}