import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function DashboardHub() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else {
        const profile = (user.profileType || user.role || "employee").toLowerCase();

        if (profile === "stagiaire") {
          setLocation("/student/dashboard");
        } else if (profile === "employee") {
          setLocation("/employee/dashboard");
        } else if (profile === "comptable") {
          setLocation("/comptable/dashboard");
        } else if (profile === "admin") {
          setLocation("/admin/dashboard");
        } else {
          setLocation("/employee/dashboard");
        }
      }
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
}