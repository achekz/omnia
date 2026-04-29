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

function normalizeDashboardRole(value: unknown): UserRole {
  const normalized = String(value || "").trim().toLowerCase();

  if (["admin", "company_admin", "cabinet_admin", "manager", "entreprise"].includes(normalized)) return "admin";
  if (["employee", "employe", "employé", "rh", "hr"].includes(normalized)) return "employee";
  if (["stagiaire", "intern", "student", "etudiant", "étudiant"].includes(normalized)) return "stagiaire";
  if (["comptable", "accountant"].includes(normalized)) return "comptable";

  return "employee";
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
