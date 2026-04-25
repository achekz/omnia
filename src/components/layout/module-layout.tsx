import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  Bot,
  Box,
  Briefcase,
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
  Plus,
  Receipt,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideProps,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetNotifications } from "@/lib/api-client";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { SettingsMenu } from "@/components/ui/settings-menu";

interface ModuleLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onItemChange?: (moduleId: string, itemId: string) => void;
}

type ProfileType = "company" | "cabinet" | "employee" | "student" | "accountant";

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
    allowedProfiles: ["company", "cabinet", "employee", "student"],
    items: [{ id: "ai-home", label: "Assistant IA", icon: <Bot className="w-4 h-4" />, path: "/ai" }],
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
      { id: "organisation", label: "Organization", icon: <Building2 className="w-4 h-4" />, path: "/employee/organization" },
      { id: "analytics-eng", label: "Analytics Engagement", icon: <BarChart3 className="w-4 h-4" />, path: "/employee/analytics-engagement" },
      { id: "analytics-rh", label: "Employee Analytics", icon: <TrendingUp className="w-4 h-4" />, path: "/employee/analytics" },
      { id: "vision", label: "Vision & Strategy", icon: <Target className="w-4 h-4" />, path: "/employee/strategy" },
      { id: "recruitment", label: "Recruitment", icon: <UserPlus className="w-4 h-4" />, path: "/employee/recruitment" },
      { id: "employes", label: "Employees", icon: <Users className="w-4 h-4" />, path: "/employee/employees" },
      { id: "projets", label: "Projects", icon: <Briefcase className="w-4 h-4" />, path: "/employee/projects" },
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
    allowedProfiles: ["accountant"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/accountant" },
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
    allowedProfiles: ["student"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/student" },
      { id: "planner", label: "Study Planner", icon: <Calendar className="w-4 h-4" />, path: "/planner" },
      { id: "budget", label: "Budget Tracker", icon: <Calculator className="w-4 h-4" />, path: "/budget" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
];

function Building2(props: LucideProps) {
  return <BanknoteIcon {...props} />;
}

function BanknoteIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export function ModuleLayout({ children, activeItem = "dashboard", onItemChange }: ModuleLayoutProps) {
  const { user, logout } = useAuth();
  const [pathname, setLocation] = useLocation();
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState(activeItem);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showMoreModules, setShowMoreModules] = useState(false);
  const currentProfile = (user?.profileType || user?.role || "employee") as ProfileType;

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
  const hiddenPrimaryModuleId = currentProfile === "employee"
    ? "employee-workspace"
    : currentProfile === "accountant"
      ? "accounting-workspace"
      : null;
  const filteredModules = hiddenPrimaryModuleId
    ? allowedModules.filter((moduleItem) => moduleItem.id !== hiddenPrimaryModuleId)
    : allowedModules;
  const visibleModules = filteredModules.slice(0, 7);
  const moreModules = filteredModules.slice(7);

  const handleModuleClick = (moduleId: string) => {
    const moduleItem = allowedModules.find((entry) => entry.id === moduleId);
    if (!moduleItem) {
      return;
    }

    setActiveModuleId(moduleId);
    setShowMoreModules(false);

    const firstItem = moduleItem.items[0];
    if (firstItem) {
      setActiveSidebarItem(firstItem.id);
      if (firstItem.path) {
        setLocation(firstItem.path);
      }
    }
  };

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
          <button className="hidden lg:flex w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center transition-colors">
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400 rotate-90" />
          </button>
        </div>

        <nav className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide py-2">
          {visibleModules.map((moduleItem) => {
            const isActive = activeModuleId === moduleItem.id;

            return (
              <button
                key={moduleItem.id}
                onClick={() => handleModuleClick(moduleItem.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 border border-transparent",
                  isActive
                    ? `${moduleItem.bg} text-white shadow-sm`
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700",
                )}
              >
                <span className={isActive ? "text-white" : moduleItem.textColor}>{moduleItem.icon}</span>
                {moduleItem.label}
              </button>
            );
          })}

          {moreModules.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreModules((current) => !current)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  showMoreModules
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Plus
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showMoreModules && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50 min-w-[200px]">
                  {moreModules.map((moduleItem) => (
                    <button
                      key={moduleItem.id}
                      onClick={() => handleModuleClick(moduleItem.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className={moduleItem.textColor}>{moduleItem.icon}</span>
                      {moduleItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block" />

          <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 whitespace-nowrap transition-all shrink-0">
            <Plus className="w-3.5 h-3.5" />
            Module
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <BackButton />
          <SettingsMenu />

          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-full text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 capitalize">
                {currentProfile} {user.tenantId ? "" : "(Demo)"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-600 hidden sm:block" />
          </div>
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

      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 h-full relative z-10 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="font-display font-bold text-lg text-gray-900">Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!notifications.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                  <Bell className="w-12 h-12 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Vous n'avez aucune notification.</p>
                </div>
              ) : (
                notifications.map((notification: Notification) => (
                  <div
                    key={notification._id ?? notification.id}
                    className={cn(
                      "p-4 rounded-2xl border text-sm transition-all cursor-pointer hover:shadow-md",
                      notification.isRead
                        ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-60"
                        : "bg-purple-50/30 border-purple-100 shadow-sm dark:bg-purple-950/20 dark:border-purple-900",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          notification.type === "danger"
                            ? "bg-rose-500"
                            : notification.type === "warning"
                              ? "bg-amber-500"
                              : notification.type === "success"
                                ? "bg-emerald-500"
                                : "bg-blue-500",
                        )}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 leading-tight">{notification.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{notification.message}</p>
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
