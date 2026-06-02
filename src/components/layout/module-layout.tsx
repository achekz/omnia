// Role du fichier: structure la mise en page et la navigation globale.
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  Bot,
  Box,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pickaxe,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetNotifications } from "@/lib/api-client";
import { normalizeRole } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { ProfileMenu } from "@/components/layout/profile-menu";

interface ModuleLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onItemChange?: (moduleId: string, itemId: string) => void;
}

type ProfileType = UserRole | "company" | "cabinet";

interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  path?: string;
}

interface NavModule {
  id: string;
  label: string;
  icon: JSX.Element;
  bg: string;
  textColor: string;
  activeSidebarStyle: string;
  allowedProfiles: ProfileType[];
  items: NavItem[];
}

const MODULES: NavModule[] = [
  {
    id: "ai",
    label: "IA Assistant",
    icon: <Bot className="w-4 h-4" />,
    bg: "bg-violet-500",
    textColor: "text-violet-600",
    activeSidebarStyle: "border-violet-400/30 bg-violet-500/15 text-violet-100 font-semibold shadow-sm shadow-violet-950/30",
    allowedProfiles: ["company", "cabinet", "employee", "stagiaire", "admin"],
    items: [
      { id: "ai-home", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
      { id: "insights", label: "AI Insights", icon: <Sparkles className="w-4 h-4" />, path: "/insights" },
    ],
  },
  {
    id: "admin-workspace",
    label: "Admin",
    icon: <ShieldCheck className="w-4 h-4" />,
    bg: "bg-violet-700",
    textColor: "text-violet-700",
    activeSidebarStyle: "border-violet-400/30 bg-violet-500/15 text-violet-100 font-semibold shadow-sm shadow-violet-950/30",
    allowedProfiles: ["admin"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/admin/dashboard" },
      { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, path: "/admin/users" },
      { id: "presences", label: "Presences", icon: <Calendar className="w-4 h-4" />, path: "/admin/presences" },
      { id: "admin-tasks", label: "Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/admin/tasks" },
      { id: "rules", label: "Rule Engine", icon: <ShieldCheck className="w-4 h-4" />, path: "/admin/rules" },
      { id: "recommendations", label: "Recommendations", icon: <Lightbulb className="w-4 h-4" />, path: "/admin/recommendations" },
      { id: "ai", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
      { id: "insights", label: "AI Insights", icon: <Sparkles className="w-4 h-4" />, path: "/insights" },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    icon: <Box className="w-4 h-4" />,
    bg: "bg-purple-500",
    textColor: "text-purple-600",
    activeSidebarStyle: "border-purple-400/30 bg-purple-500/15 text-purple-100 font-semibold shadow-sm shadow-purple-950/30",
    allowedProfiles: ["company"],
    items: [{ id: "cat-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "employee-workspace",
    label: "Employee",
    icon: <Users className="w-4 h-4" />,
    bg: "bg-sky-600",
    textColor: "text-sky-600",
    activeSidebarStyle: "border-sky-400/30 bg-sky-500/15 text-sky-100 font-semibold shadow-sm shadow-sky-950/30",
    allowedProfiles: ["company", "employee"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/employee" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "insights", label: "AI Insights", icon: <Sparkles className="w-4 h-4" />, path: "/insights" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "comptable-workspace",
    label: "Comptable",
    icon: <Users className="w-4 h-4" />,
    bg: "bg-sky-600",
    textColor: "text-sky-600",
    activeSidebarStyle: "border-sky-400/30 bg-sky-500/15 text-sky-100 font-semibold shadow-sm shadow-sky-950/30",
    allowedProfiles: ["comptable"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/comptable/dashboard" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "insights", label: "AI Insights", icon: <Sparkles className="w-4 h-4" />, path: "/insights" },
      { id: "ai", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: <Target className="w-4 h-4" />,
    bg: "bg-blue-500",
    textColor: "text-blue-600",
    activeSidebarStyle: "border-blue-400/30 bg-blue-500/15 text-blue-100 font-semibold shadow-sm shadow-blue-950/30",
    allowedProfiles: ["company"],
    items: [{ id: "crm-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "inventaire",
    label: "Inventaire",
    icon: <Package className="w-4 h-4" />,
    bg: "bg-teal-500",
    textColor: "text-teal-600",
    activeSidebarStyle: "border-teal-400/30 bg-teal-500/15 text-teal-100 font-semibold shadow-sm shadow-teal-950/30",
    allowedProfiles: ["company"],
    items: [{ id: "inv-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "paie",
    label: "Paie-TN",
    icon: <FileText className="w-4 h-4" />,
    bg: "bg-lime-500",
    textColor: "text-lime-600",
    activeSidebarStyle: "border-lime-400/30 bg-lime-500/15 text-lime-100 font-semibold shadow-sm shadow-lime-950/30",
    allowedProfiles: ["company", "cabinet"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, path: "/paie/dashboard" },
      { id: "salaries", label: "Salariés", icon: <Users className="w-4 h-4" /> },
      { id: "exercices", label: "Exercices", icon: <Calendar className="w-4 h-4" /> },
      { id: "cnss", label: "CNSS", icon: <FileText className="w-4 h-4" /> },
      { id: "declaration", label: "Déclaration employeur", icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    id: "btp",
    label: "BTP",
    icon: <Pickaxe className="w-4 h-4" />,
    bg: "bg-amber-600",
    textColor: "text-amber-700",
    activeSidebarStyle: "border-amber-400/30 bg-amber-500/15 text-amber-100 font-semibold shadow-sm shadow-amber-950/30",
    allowedProfiles: ["company"],
    items: [{ id: "btp-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "stagiaire-workspace",
    label: "Stagiaire",
    icon: <Users className="w-4 h-4" />,
    bg: "bg-sky-600",
    textColor: "text-sky-600",
    activeSidebarStyle: "border-sky-400/30 bg-sky-500/15 text-sky-100 font-semibold shadow-sm shadow-sky-950/30",
    allowedProfiles: ["stagiaire"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/stagiaire/dashboard" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "insights", label: "AI Insights", icon: <Sparkles className="w-4 h-4" />, path: "/insights" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
];

export function ModuleLayout({ children, activeItem = "dashboard", onItemChange }: ModuleLayoutProps) {
  const { user, logout } = useAuth();
  const [pathname, setLocation] = useLocation();
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState(activeItem);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentProfile = normalizeRole(user?.profileType || user?.role) as ProfileType;

  const { data: notifications = [] } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000 },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const allowed = MODULES.filter((moduleItem) => moduleItem.allowedProfiles.includes(currentProfile));
    let foundParentId = allowed[0]?.id ?? "";
    let foundItemId = activeItem;

    for (const moduleItem of allowed) {
      const matchedItem = moduleItem.items.find(
        (item) => item.id === activeItem || item.path === pathname,
      );

      if (matchedItem) {
        foundParentId = moduleItem.id;
        foundItemId = matchedItem.id;
        break;
      }
    }

    setActiveModuleId(foundParentId);
    setActiveSidebarItem(foundItemId);
  }, [activeItem, currentProfile, pathname, user]);

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const allowedModules = MODULES.filter((moduleItem) => moduleItem.allowedProfiles.includes(currentProfile));
  const activeModule = allowedModules.find((moduleItem) => moduleItem.id === activeModuleId) ?? allowedModules[0];
  const handleSidebarItemClick = (item: NavItem) => {
    setActiveSidebarItem(item.id);
    if (item.path) {
      setLocation(item.path);
    }
    setIsSidebarOpen(false);
    onItemChange?.(activeModuleId, item.id);
  };

  return (
    <div className="h-dvh bg-slate-50 text-slate-950 flex flex-col font-sans overflow-hidden dark:bg-slate-950 dark:text-slate-100">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 shadow-sm shadow-slate-200/70 relative z-40 dark:bg-slate-950 dark:border-slate-800 dark:shadow-slate-950/40">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-3 shrink-0 mr-2 sm:mr-4 lg:w-[208px]">
          <Link href="/" className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="hidden font-display font-bold text-xl text-slate-950 tracking-tight sm:inline dark:text-slate-100">Omni AI</span>
          </Link>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 sm:ml-4">
          <div className="hidden sm:block">
            <BackButton />
          </div>

          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
            )}
          </button>

          <ProfileMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-gray-950/55 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu overlay"
          />
        )}
        {activeModule && (
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 flex w-[min(86vw,280px)] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl shadow-slate-300/60 transition-transform duration-300 lg:relative lg:z-30 lg:w-[240px] lg:translate-x-0 lg:shadow-none dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-950/60",
              isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-4 lg:hidden dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-lg font-bold">Omni AI</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Modules</p>

              <div
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all",
                  activeModule.bg,
                )}
              >
                {activeModule.label}
              </div>
            </div>

            <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
              {activeModule.items.map((item) => {
                const isActive = activeSidebarItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarItemClick(item)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all duration-200 border border-transparent",
                      isActive
                        ? activeModule.activeSidebarStyle
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-medium dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(isActive ? "text-current" : "text-slate-500 dark:text-slate-500")}>
                        {item.icon}
                      </span>
                      {item.label}
                    </div>
                    {isActive && <ChevronDown className="w-4 h-4 -rotate-90 opacity-50" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        )}

        <main className="container-fluid flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 px-0 relative dark:bg-slate-950">{children}</main>
      </div>

      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}
