import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import DashboardHub from "@/pages/dashboard/index";
import CompanyDashboard from "@/pages/dashboard/company";
import CabinetDashboard from "@/pages/dashboard/cabinet";
import EmployeeDashboard from "@/pages/dashboard/employee";
import StudentDashboard from "@/pages/dashboard/student";
import AccountantDashboard from "@/pages/AccountantDashboard";

function ProtectedRoute({ component: Component }: any) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return <Component />;
}

function Router() {
  const [pathname] = useLocation();

  if (pathname === "/login") return <Login />;
  if (pathname === "/register") return <Register />;

  if (pathname === "/dashboard") return <ProtectedRoute component={DashboardHub} />;
  if (pathname === "/dashboard/company") return <ProtectedRoute component={CompanyDashboard} />;
  if (pathname === "/dashboard/cabinet") return <ProtectedRoute component={CabinetDashboard} />;
  if (pathname === "/dashboard/employee") return <ProtectedRoute component={EmployeeDashboard} />;
  if (pathname === "/dashboard/student") return <ProtectedRoute component={StudentDashboard} />;
  if (pathname === "/dashboard/accountant") return <ProtectedRoute component={AccountantDashboard} />;

  if (pathname === "/") return <Login />;

  return <NotFound />;
}

export default Router;