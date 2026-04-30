import type { UserRole } from "./types";

export const CANONICAL_ROLES: UserRole[] = ["admin", "employee", "stagiaire", "comptable"];

export const ROLE_ALIASES: Record<string, UserRole> = {
  company_admin: "admin",
  cabinet_admin: "admin",
  manager: "admin",
  company: "admin",
  cabinet: "comptable",
  enterprise: "admin",
  entreprise: "admin",
  user: "employee",
  employe: "employee",
  employé: "employee",
  rh: "employee",
  hr: "employee",
  intern: "stagiaire",
  student: "stagiaire",
  etudiant: "stagiaire",
  étudiant: "stagiaire",
  accountant: "comptable",
  accounting: "comptable",
};

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  employee: "/employee/dashboard",
  stagiaire: "/stagiaire/dashboard",
  comptable: "/comptable/dashboard",
};

export function normalizeRole(value: unknown, fallback: UserRole = "employee"): UserRole {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (CANONICAL_ROLES.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  return ROLE_ALIASES[normalized] || fallback;
}

export function normalizeRoleOrNull(value: unknown): UserRole | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (CANONICAL_ROLES.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  return ROLE_ALIASES[normalized] || null;
}

export function getRoleRedirect(value: unknown) {
  return ROLE_REDIRECTS[normalizeRole(value)];
}
