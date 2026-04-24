import { useState, type ReactNode, type SVGProps } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  BookOpen,
  BrainCircuit,
  CheckSquare,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Menu,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetNotifications } from "@/lib/api-client";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { SettingsMenu } from "@/components/ui/settings-menu";

interface SharedLayoutProps {
  children: ReactNode;
}

interface NavLink {
  name: string;
  path: string;
  icon: JSX.Element;
}

export function SharedLayout({ children }: SharedLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const { data: notifications = [], isLoading: isLoadingNotifs } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000 },
  });

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const getNavLinks = (): NavLink[] => {
    switch (user.profileType) {
      case "accountant":
        return [
          { name: "Dashboard", path: "/dashboard/accountant", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "Payroll", path: "/paie/dashboard", icon: <FileText className="w-5 h-5" /> },
          { name: "AI Insights", path: "/ai", icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      case "employee":
        return [
          { name: "Dashboard", path: "/dashboard/employee", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "My Tasks", path: "/tasks", icon: <CheckSquare className="w-5 h-5" /> },
          { name: "AI Insights", path: "/ai", icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      case "student":
        return [
          { name: "Dashboard", path: "/dashboard/student", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "Study Plan", path: "/planner", icon: <BookOpen className="w-5 h-5" /> },
          { name: "Exams", path: "/planner", icon: <GraduationCap className="w-5 h-5" /> },
          { name: "Budget", path: "/budget", icon: <Wallet className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-sm",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight gradient-text">Omni AI</span>
        </div>

        <div className="px-6 pb-4">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              className="w-10 h-10 rounded-lg object-cover bg-white dark:bg-gray-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.profileType}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location === link.path;
            return (
              <Link
                key={link.name}
                href={link.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  isActive
                    ? "gradient-bg text-white shadow-md shadow-purple-500/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-400",
                )}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30 px-4 md:px-8 flex items-center justify-between sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              <Menu className="w-6 h-6" />
            </button>
            <BackButton />
            <h1 className="font-display text-xl font-bold text-gray-900 hidden sm:block">Welcome back, {user.name.split(" ")[0]} 👋</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
            </button>
            <SettingsMenu />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>

      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 h-full relative z-10 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="font-display font-bold text-lg text-gray-900">Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingNotifs ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 p-8">No new notifications</p>
              ) : (
                notifications.map((notification: Notification) => (
                  <div
                    key={notification._id ?? notification.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors",
                      notification.isRead ? "bg-gray-50 border-transparent opacity-70" : "bg-purple-50/50 border-purple-100",
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                          notification.type === "danger"
                            ? "bg-rose-100 text-rose-700"
                            : notification.type === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : notification.type === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {notification.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Just now</span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 mt-2">{notification.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
