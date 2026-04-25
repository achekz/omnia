import { useEffect, type ComponentType } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "./pages/not-found";
import LandingPage from "./pages/landing";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import AdminDashboard from "./pages/AdminDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import DashboardHub from "./pages/dashboard";
import CompanyDashboard from "./pages/dashboard/company";
import CabinetDashboard from "./pages/dashboard/cabinet";
import EmployeeDashboard from "./pages/dashboard/employee";
import StudentDashboard from "./pages/dashboard/student";
import AIDashboard from "./pages/ai";
import BudgetPage from "./pages/budget/budget";
import PlannerPage from "./pages/planner";
import MyTasksPage from "./pages/tasks/my-tasks";
import SettingsPage from "./pages/settings";
import MyPerformancePage from "./pages/performance/my-performance";
import RHEmployeesPage from "./pages/rh/employes";
import PaieDashboardPage from "./pages/paie/dashboard";
import HelpCenterPage from "./pages/help/center";
import EmployeeSectionPage from "./pages/employee/section";

interface AppRoute {
  path: string;
  component: ComponentType;
  protected?: boolean;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-sm font-medium">Loading...</div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
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
  { path: "/dashboard/student", component: StudentDashboard, protected: true },
  { path: "/dashboard/accountant", component: AccountantDashboard, protected: true },
  { path: "/admin", component: AdminDashboard, protected: true },
  { path: "/ai", component: AIDashboard, protected: true },
  { path: "/budget", component: BudgetPage, protected: true },
  { path: "/planner", component: PlannerPage, protected: true },
  { path: "/tasks", component: MyTasksPage, protected: true },
  { path: "/settings", component: SettingsPage, protected: true },
  { path: "/performance", component: MyPerformancePage, protected: true },
  { path: "/rh/employes", component: RHEmployeesPage, protected: true },
  { path: "/employee/organization", component: EmployeeSectionPage, protected: true },
  { path: "/employee/analytics-engagement", component: EmployeeSectionPage, protected: true },
  { path: "/employee/analytics", component: EmployeeSectionPage, protected: true },
  { path: "/employee/strategy", component: EmployeeSectionPage, protected: true },
  { path: "/employee/recruitment", component: EmployeeSectionPage, protected: true },
  { path: "/employee/employees", component: EmployeeSectionPage, protected: true },
  { path: "/employee/projects", component: EmployeeSectionPage, protected: true },
  { path: "/paie/dashboard", component: PaieDashboardPage, protected: true },
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
        {routes.map(({ path, component: Component, protected: isProtected }) => (
          <Route key={path} path={path}>
            {isProtected ? <ProtectedRoute component={Component} /> : <Component />}
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
