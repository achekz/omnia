// Role du fichier: structure la mise en page et la navigation globale.
import { useState, type ReactNode, type SVGProps } from "react";
import { Link, useLocation } from "wouter";
import { Bell, BrainCircuit, CheckSquare, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetNotifications } from "@/lib/api-client";
import { normalizeRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { ProfileMenu } from "@/components/layout/profile-menu";

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

  const { data: notifications = [] } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000 },
  });

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const getNavLinks = (): NavLink[] => {
    switch (normalizeRole(user.profileType || user.role)) {
      case "comptable":
        return [
          { name: "Dashboard", path: "/comptable/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "AI Insights", path: "/ai", icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      case "employee":
        return [
          { name: "Dashboard", path: "/dashboard/employee", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "My Tasks", path: "/tasks", icon: <CheckSquare className="w-5 h-5" /> },
          { name: "AI Insights", path: "/ai", icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      case "stagiaire":
        return [
          { name: "Dashboard", path: "/stagiaire/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: "My Tasks", path: "/tasks", icon: <CheckSquare className="w-5 h-5" /> },
          { name: "AI Insights", path: "/ai", icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex overflow-x-hidden">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-dvh w-[min(86vw,18rem)] bg-slate-950 border-r border-slate-800 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-sm shadow-slate-950/40 md:w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight gradient-text">Omni AI</span>
          </div>
          <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center gap-3">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              className="w-10 h-10 rounded-lg object-cover bg-slate-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-100">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.profileType}</p>
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
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <header className="h-16 sm:h-20 bg-slate-950 border-b border-slate-800 z-30 px-3 sm:px-4 md:px-8 flex items-center justify-between sticky top-0 shadow-sm shadow-slate-950/40">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-slate-100">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block"><BackButton /></div>
            <h1 className="font-display text-xl font-bold text-slate-100 hidden sm:block">Welcome back, {user.name.split(" ")[0]}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-950" />}
            </button>
            <ProfileMenu />
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-8">
          <div className="container-fluid max-w-7xl mx-auto px-0">{children}</div>
        </div>
      </main>

      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
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
