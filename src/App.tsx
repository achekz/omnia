import { Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SocketProvider } from "@/context/SocketContext";
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
import MyTasks from "@/pages/tasks/my-tasks";
import SettingsPage from "@/pages/settings/index";
import StudyPlannerPage from "@/pages/academics/study-planner";
import BudgetTrackerPage from "@/pages/academics/budget-tracker";
import MyPerformancePage from "@/pages/performance/my-performance";
import AIDashboard from "@/pages/ai/index";
import EmployesRedesign from "@/pages/rh/employes";
import PaieTunisieDashboard from "@/pages/paie/dashboard";
import LandingPage from "@/pages/landing";
import HelpCenterPage from "@/pages/help/center";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedProfiles }: { component: any, allowedProfiles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    } else if (!isLoading && isAuthenticated && allowedProfiles && user && !allowedProfiles.includes(user.profileType)) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, setLocation, allowedProfiles]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a]"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (!isAuthenticated) return null;
  
  return <Component />;
}

function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (isAuthenticated) setLocation('/dashboard');
  }, [isAuthenticated, setLocation]);

  return <LandingPage />;
}

function Router() {
  const [pathname] = useLocation();

  if (pathname === "/login") return <Login />;
  if (pathname === "/register") return <Register />;
  
  // Dashboard routing based on user type
  if (pathname === "/dashboard") return <ProtectedRoute component={DashboardHub} />;
  if (pathname === "/dashboard/company") return <ProtectedRoute component={CompanyDashboard} allowedProfiles={['company']} />;
  if (pathname === "/dashboard/cabinet") return <ProtectedRoute component={CabinetDashboard} allowedProfiles={['cabinet']} />;
  if (pathname === "/dashboard/employee") return <ProtectedRoute component={EmployeeDashboard} allowedProfiles={['employee']} />;
  if (pathname === "/dashboard/student") return <ProtectedRoute component={StudentDashboard} allowedProfiles={['student']} />;
  
  if (pathname === "/tasks") return <ProtectedRoute component={MyTasks} />;
  if (pathname === "/settings") return <ProtectedRoute component={SettingsPage} />;
  if (pathname === "/help") return <ProtectedRoute component={HelpCenterPage} />;
  
  if (pathname === "/planner") return <ProtectedRoute component={StudyPlannerPage} allowedProfiles={['student']} />;
  if (pathname === "/budget") return <ProtectedRoute component={BudgetTrackerPage} allowedProfiles={['student']} />;
  if (pathname === "/performance") return <ProtectedRoute component={MyPerformancePage} allowedProfiles={['employee']} />;
  if (pathname === "/ai") return <ProtectedRoute component={AIDashboard} />;
  if (pathname === "/rh/employes") return <ProtectedRoute component={EmployesRedesign} allowedProfiles={['company']} />;
  if (pathname === "/paie/dashboard") return <ProtectedRoute component={PaieTunisieDashboard} allowedProfiles={['company', 'cabinet']} />;

  if (pathname === "/" || pathname === "") return <Home />;
  
  return <NotFound />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="/">
          <AuthProvider>
            <SocketProvider>
              <Router />
            </SocketProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
