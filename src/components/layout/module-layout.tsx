import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  Bot,
  Box,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileText,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  Pickaxe,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetNotifications } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { ProfileMenu } from "@/components/layout/profile-menu";

interface ModuleLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onItemChange?: (moduleId: string, itemId: string) => void;
}

type ProfileType = "company" | "cabinet" | "employee" | "comptable" | "stagiaire" | "admin";

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
    id: "tresorerie",
    label: "Trésorerie",
    icon: <DollarSign className="w-4 h-4" />,
    bg: "bg-emerald-500",
    textColor: "text-emerald-600",
    activeSidebarStyle: "bg-emerald-50 text-emerald-600 font-semibold",
    allowedProfiles: ["company", "cabinet"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, path: "/dashboard/company" },
      { id: "achats", label: "Achats", icon: <ShoppingCart className="w-4 h-4" /> },
      { id: "ventes", label: "Ventes", icon: <TrendingUp className="w-4 h-4" /> },
      { id: "cashflow", label: "Cash-Flow", icon: <Wallet className="w-4 h-4" /> },
      { id: "charges", label: "Charges", icon: <Receipt className="w-4 h-4" /> },
      { id: "banque", label: "Banque", icon: <Landmark className="w-4 h-4" /> },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "ai",
    label: "Assistant IA",
    icon: <Bot className="w-4 h-4" />,
    bg: "bg-violet-500",
    textColor: "text-violet-600",
    activeSidebarStyle: "bg-violet-50 text-violet-600 font-semibold",
    allowedProfiles: ["company", "cabinet", "employee", "stagiaire", "admin"],
    items: [{ id: "ai-home", label: "Assistant IA", icon: <Bot className="w-4 h-4" />, path: "/ai" }],
  },
  {
    id: "admin-workspace",
    label: "Admin",
    icon: <ShieldCheck className="w-4 h-4" />,
    bg: "bg-violet-700",
    textColor: "text-violet-700",
    activeSidebarStyle: "bg-violet-50 text-violet-700 font-semibold",
    allowedProfiles: ["admin"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/admin/dashboard" },
      { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, path: "/admin/users" },
      { id: "presences", label: "Presences", icon: <Calendar className="w-4 h-4" />, path: "/admin/presences" },
      { id: "admin-tasks", label: "Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/admin/tasks" },
      { id: "rules", label: "Rule Engine", icon: <ShieldCheck className="w-4 h-4" />, path: "/admin/rules" },
      { id: "ai", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
      { id: "settings", label: "Settings", icon: <FileText className="w-4 h-4" />, path: "/settings" },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    icon: <Box className="w-4 h-4" />,
    bg: "bg-purple-500",
    textColor: "text-purple-600",
    activeSidebarStyle: "bg-purple-50 text-purple-600 font-semibold",
    allowedProfiles: ["company"],
    items: [{ id: "cat-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "employee-workspace",
    label: "Employee",
    icon: <Users className="w-4 h-4" />,
    bg: "bg-sky-600",
    textColor: "text-sky-600",
    activeSidebarStyle: "bg-sky-50 text-sky-700 font-semibold",
    allowedProfiles: ["company", "employee"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/employee" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "performances", label: "Performance", icon: <BarChart3 className="w-4 h-4" />, path: "/performance" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "accounting-workspace",
    label: "Accounting",
    icon: <Calculator className="w-4 h-4" />,
    bg: "bg-emerald-600",
    textColor: "text-emerald-600",
    activeSidebarStyle: "bg-emerald-50 text-emerald-700 font-semibold",
    allowedProfiles: ["comptable"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/comptable/dashboard" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "budget", label: "Finance", icon: <Wallet className="w-4 h-4" />, path: "/budget" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "payroll", label: "Payroll", icon: <FileText className="w-4 h-4" />, path: "/paie/dashboard" },
      { id: "ai", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: <Target className="w-4 h-4" />,
    bg: "bg-blue-500",
    textColor: "text-blue-600",
    activeSidebarStyle: "bg-blue-50 text-blue-600 font-semibold",
    allowedProfiles: ["company"],
    items: [{ id: "crm-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "inventaire",
    label: "Inventaire",
    icon: <Package className="w-4 h-4" />,
    bg: "bg-teal-500",
    textColor: "text-teal-600",
    activeSidebarStyle: "bg-teal-50 text-teal-600 font-semibold",
    allowedProfiles: ["company"],
    items: [{ id: "inv-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "paie",
    label: "Paie-TN",
    icon: <FileText className="w-4 h-4" />,
    bg: "bg-lime-500",
    textColor: "text-lime-600",
    activeSidebarStyle: "bg-lime-50 text-lime-600 font-semibold",
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
    activeSidebarStyle: "bg-amber-50 text-amber-700 font-semibold",
    allowedProfiles: ["company"],
    items: [{ id: "btp-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    id: "academics",
    label: "Scolarité",
    icon: <GraduationCap className="w-4 h-4" />,
    bg: "bg-purple-500",
    textColor: "text-purple-600",
    activeSidebarStyle: "bg-purple-50 text-purple-600 font-semibold",
    allowedProfiles: ["stagiaire"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/student" },
      { id: "presence", label: "Presence", icon: <Calendar className="w-4 h-4" />, path: "/presence" },
      { id: "planner", label: "Study Planner", icon: <Calendar className="w-4 h-4" />, path: "/planner" },
      { id: "budget", label: "Budget Tracker", icon: <Calculator className="w-4 h-4" />, path: "/budget" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
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
  const rawProfile = String(user?.profileType || user?.role || "employee").toLowerCase();
  const currentProfile = (rawProfile === "accountant" ? "comptable" : rawProfile === "intern" ? "stagiaire" : rawProfile) as ProfileType;

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
    onItemChange?.(activeModuleId, item.id);
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans overflow-hidden">
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 shrink-0 shadow-sm relative z-40">
        <div className="flex items-center gap-3 shrink-0 mr-4 w-[208px]">
          <Link href="/" className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900 tracking-tight">Omni AI</span>
          </Link>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <BackButton />

          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-full text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          <ProfileMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {activeModule && (
          <aside className="w-[240px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 overflow-hidden relative z-30">
            <div className="p-4 flex flex-col items-center">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3">Modules</p>

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
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 font-medium",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(isActive ? activeModule.textColor : "text-gray-400 dark:text-gray-600")}>
                        {item.icon}
                      </span>
                      {item.label}
                    </div>
                    {isActive && <ChevronDown className="w-4 h-4 -rotate-90 opacity-50" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 relative">{children}</main>
      </div>

      <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}
