// Role du fichier: declare les routes frontend et les protections par role.
import { useEffect, type ComponentType } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/types";
import { normalizeRoleOrNull } from "@/lib/roles";

import NotFound from "./pages/not-found";
import LandingPage from "./pages/landing";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import VerifyResetCodePage from "./pages/auth/verify-reset-code";
import ResetPasswordPage from "./pages/auth/reset-password";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardHub from "./pages/dashboard";
import CompanyDashboard from "./pages/dashboard/company";
import CabinetDashboard from "./pages/dashboard/cabinet";
import EmployeeDashboard from "./pages/dashboard/employee";
import StagiaireDashboard from "./pages/dashboard/stagiaire";
import AIDashboard from "./pages/ai";
import InsightOverviewPage from "./pages/insights/overview";
import PresencePage from "./pages/presence";
import MyTasksPage from "./pages/tasks/my-tasks";
import TaskDetailsPage from "./pages/tasks/task-details";
import SettingsPage from "./pages/settings";
import NotificationsPage from "./pages/notifications";
import RuleEnginePage from "./pages/rules";
import AdminUsersPage from "./pages/admin/users";
import AdminUserTaskDetailsPage from "./pages/admin/user-task-details";
import AdminPresencesPage from "./pages/admin/presences";
import AdminPresenceDayPage from "./pages/admin/presence-day";
import AdminTasksPage from "./pages/admin/tasks";
import AdminRecommendationsPage from "./pages/admin/recommendations";
import RHEmployeesPage from "./pages/rh/employes";
import PaieDashboardPage from "./pages/paie/dashboard";
import HelpCenterPage from "./pages/help/center";
import EmployeeSectionPage from "./pages/employee/section";

interface AppRoute {
  path: string;
  component: ComponentType;
  protected?: boolean;
  roles?: UserRole[];
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-sm font-medium">Loading...</div>
    </div>
  );
}

function ProtectedRoute({ component: Component, roles }: { component: ComponentType; roles?: UserRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (roles?.length) {
    const currentRole = normalizeRoleOrNull(user?.profileType || user?.role);

    if (!currentRole || !roles.includes(currentRole)) {
      return <Redirect to="/dashboard" />;
    }
  }

  return <Component />;
}

function PublicAuthRoute({ component: Component }: { component: ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <LandingPage />;
}

function PerformanceRedirect() {
  return <Redirect to="/insights" />;
}

function ScrollToTop() {
  const [pathname] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const routes: AppRoute[] = [
  { path: "/dashboard", component: DashboardHub, protected: true },

  { path: "/dashboard/company", component: CompanyDashboard, protected: true },
  { path: "/dashboard/cabinet", component: CabinetDashboard, protected: true },

  { path: "/dashboard/employee", component: EmployeeDashboard, protected: true },
  { path: "/employee/dashboard", component: EmployeeDashboard, protected: true, roles: ["employee"] },

  { path: "/stagiaire/dashboard", component: StagiaireDashboard, protected: true, roles: ["stagiaire"] },

  { path: "/comptable/dashboard", component: EmployeeDashboard, protected: true, roles: ["comptable"] },
  { path: "/dashboard/comptable", component: EmployeeDashboard, protected: true, roles: ["comptable"] },

  { path: "/admin", component: AdminDashboard, protected: true, roles: ["admin"] },
  { path: "/admin/dashboard", component: AdminDashboard, protected: true, roles: ["admin"] },
  { path: "/admin/users", component: AdminUsersPage, protected: true, roles: ["admin"] },
  { path: "/admin/users/:id", component: AdminUserTaskDetailsPage, protected: true, roles: ["admin"] },
  { path: "/admin/users/:id/tasks", component: AdminUserTaskDetailsPage, protected: true, roles: ["admin"] },
  { path: "/admin/presences/:date", component: AdminPresenceDayPage, protected: true, roles: ["admin"] },
  { path: "/admin/presences", component: AdminPresencesPage, protected: true, roles: ["admin"] },
  { path: "/admin/tasks/:userId", component: AdminTasksPage, protected: true, roles: ["admin"] },
  { path: "/admin/tasks", component: AdminTasksPage, protected: true, roles: ["admin"] },
  { path: "/admin/recommendations", component: AdminRecommendationsPage, protected: true, roles: ["admin"] },

  { path: "/rules", component: RuleEnginePage, protected: true, roles: ["admin"] },
  { path: "/admin/rules", component: RuleEnginePage, protected: true, roles: ["admin"] },

  { path: "/ai", component: AIDashboard, protected: true },
  { path: "/insights", component: InsightOverviewPage, protected: true, roles: ["admin", "comptable", "employee", "stagiaire"] },
  { path: "/ai-insights", component: InsightOverviewPage, protected: true, roles: ["admin", "comptable", "employee", "stagiaire"] },
  { path: "/presence", component: PresencePage, protected: true },
  { path: "/tasks/:id", component: TaskDetailsPage, protected: true },
  { path: "/tasks", component: MyTasksPage, protected: true },
  { path: "/settings", component: SettingsPage, protected: true },
  { path: "/profile", component: SettingsPage, protected: true },
  { path: "/notifications", component: NotificationsPage, protected: true },
  { path: "/performance", component: PerformanceRedirect, protected: true, roles: ["comptable", "employee", "stagiaire"] },
  { path: "/rh/employes", component: RHEmployeesPage, protected: true },

  { path: "/employee/organization", component: EmployeeSectionPage, protected: true },
  { path: "/employee/analytics-engagement", component: EmployeeSectionPage, protected: true },
  { path: "/employee/analytics", component: EmployeeSectionPage, protected: true },
  { path: "/employee/strategy", component: EmployeeSectionPage, protected: true },
  { path: "/employee/recruitment", component: EmployeeSectionPage, protected: true },
  { path: "/employee/employees", component: EmployeeSectionPage, protected: true },
  { path: "/employee/projects", component: EmployeeSectionPage, protected: true },

  { path: "/paie/dashboard", component: PaieDashboardPage, protected: true, roles: ["comptable"] },
  { path: "/help", component: HelpCenterPage, protected: true },
];

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/">
          <HomeRoute />
        </Route>
        <Route path="/landing" component={LandingPage} />
        <Route path="/login">
          <PublicAuthRoute component={Login} />
        </Route>
        <Route path="/register">
          <PublicAuthRoute component={Register} />
        </Route>
        <Route path="/forgot-password">
          <PublicAuthRoute component={ForgotPasswordPage} />
        </Route>
        <Route path="/verify-code">
          <PublicAuthRoute component={VerifyResetCodePage} />
        </Route>
        <Route path="/verify-reset-code">
          <PublicAuthRoute component={VerifyResetCodePage} />
        </Route>
        <Route path="/reset-password">
          <PublicAuthRoute component={ResetPasswordPage} />
        </Route>
        {routes.map(({ path, component: Component, protected: isProtected, roles }) => (
          <Route key={path} path={path}>
            {isProtected ? <ProtectedRoute component={Component} roles={roles} /> : <Component />}
          </Route>
        ))}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </>
  );
}

export default Router;
