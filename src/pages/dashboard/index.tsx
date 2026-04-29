import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/lib/types";

const REDIRECTS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  employee: "/employee/dashboard",
  stagiaire: "/student/dashboard",
  comptable: "/comptable/dashboard",
};

const ROLE_ALIASES: Record<string, UserRole> = {
  company_admin: "admin",
  cabinet_admin: "admin",
  manager: "admin",
  enterprise: "admin",
  entreprise: "admin",
  employe: "employee",
  employé: "employee",
  rh: "employee",
  hr: "employee",
  intern: "stagiaire",
  student: "stagiaire",
  etudiant: "stagiaire",
  étudiant: "stagiaire",
  accountant: "comptable",
};

function normalizeDashboardRole(value: unknown): UserRole {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "admin" || normalized === "employee" || normalized === "stagiaire" || normalized === "comptable") {
    return normalized;
  }

  return ROLE_ALIASES[normalized] || "employee";
}

export default function DashboardHub() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else {
        const profile = normalizeDashboardRole(user.profileType || user.role);
        setLocation(REDIRECTS[profile]);
      }
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}
