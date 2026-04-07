import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetNotifications } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Wallet, Landmark,
  Settings, Bell, LogOut, ChevronDown, Plus,
  Users, GraduationCap, X, BarChart3,
  Calculator, CheckCircle2, Sparkles, Calendar,
  DollarSign, ShoppingCart, TrendingUp, Receipt,
  Box, Target, UserPlus, Briefcase, Award,
  Package, FileText, Pickaxe, Bot
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { BackButton } from "@/components/ui/back-button";
import { SettingsMenu } from "@/components/ui/settings-menu";

interface ModuleLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onItemChange?: (moduleId: string, itemId: string) => void;
}

type ProfileType = 'company' | 'cabinet' | 'employee' | 'student';

interface NavModule {
  id: string;
  label: string;
  icon: JSX.Element;
  bg: string; // solid color for active top pill (e.g., bg-emerald-500)
  textColor: string; // text color for active local pill (e.g., text-emerald-600)
  activeSidebarStyle: string; // e.g., bg-emerald-50 text-emerald-600
  allowedProfiles: ProfileType[];
  items: {id: string, label: string, icon: JSX.Element, path?: string}[];
}

const MODULES: NavModule[] = [
  {
    id: "tresorerie",
    label: "Trésorerie",
    icon: <DollarSign className="w-4 h-4" />,
    bg: "bg-emerald-500",
    textColor: "text-emerald-600",
    activeSidebarStyle: "bg-emerald-50 text-emerald-600 font-semibold",
    allowedProfiles: ['company', 'cabinet'],
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
    allowedProfiles: ['company', 'cabinet', 'employee', 'student'],
    items: [
      { id: "ai-home", label: "Assistant IA", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    icon: <Box className="w-4 h-4" />,
    bg: "bg-purple-500",
    textColor: "text-purple-600",
    activeSidebarStyle: "bg-purple-50 text-purple-600 font-semibold",
    allowedProfiles: ['company'],
    items: [{ id: "cat-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }]
  },
  {
    id: "rh",
    label: "RH",
    icon: <Users className="w-4 h-4" />,
    bg: "bg-orange-500",
    textColor: "text-orange-600",
    activeSidebarStyle: "bg-orange-50 text-orange-600 font-semibold",
    allowedProfiles: ['company', 'employee'],
    items: [
      { id: "organisation", label: "Organisation", icon: <Building2 className="w-4 h-4" /> },
      { id: "analytics-eng", label: "Analytics Engagement", icon: <BarChart3 className="w-4 h-4" /> },
      { id: "analytics-rh", label: "Analytics RH", icon: <TrendingUp className="w-4 h-4" /> },
      { id: "vision", label: "Vision & Stratégie", icon: <Target className="w-4 h-4" /> },
      { id: "recrutement", label: "Recrutement", icon: <UserPlus className="w-4 h-4" /> },
      { id: "employes", label: "Employés", icon: <Users className="w-4 h-4" />, path: "/rh/employes" },
      { id: "projets", label: "Projets", icon: <Briefcase className="w-4 h-4" /> },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "performances", label: "Performances", icon: <Award className="w-4 h-4" />, path: "/performance" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: <Target className="w-4 h-4" />,
    bg: "bg-blue-500",
    textColor: "text-blue-600",
    activeSidebarStyle: "bg-blue-50 text-blue-600 font-semibold",
    allowedProfiles: ['company'],
    items: [{ id: "crm-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }]
  },
  {
    id: "inventaire",
    label: "Inventaire",
    icon: <Package className="w-4 h-4" />,
    bg: "bg-teal-500",
    textColor: "text-teal-600",
    activeSidebarStyle: "bg-teal-50 text-teal-600 font-semibold",
    allowedProfiles: ['company'],
    items: [{ id: "inv-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }]
  },
  {
    id: "paie",
    label: "Paie-TN",
    icon: <FileText className="w-4 h-4" />,
    bg: "bg-lime-500",
    textColor: "text-lime-600",
    activeSidebarStyle: "bg-lime-50 text-lime-600 font-semibold",
    allowedProfiles: ['company', 'cabinet'],
    items: [
       { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, path: "/paie/dashboard" },
       { id: "salaries", label: "Salariés", icon: <Users className="w-4 h-4" /> },
       { id: "exercices", label: "Exercices", icon: <Calendar className="w-4 h-4" /> },
       { id: "cnss", label: "CNSS", icon: <FileText className="w-4 h-4" /> },
       { id: "declaration", label: "Déclaration employeur", icon: <FileText className="w-4 h-4" /> },
    ]
  },
  {
    id: "btp",
    label: "BTP",
    icon: <Pickaxe className="w-4 h-4" />,
    bg: "bg-amber-600",
    textColor: "text-amber-700",
    activeSidebarStyle: "bg-amber-50 text-amber-700 font-semibold",
    allowedProfiles: ['company'],
    items: [{ id: "btp-dash", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }]
  },
  {
    id: "academics",
    label: "Scolarité",
    icon: <GraduationCap className="w-4 h-4" />,
    bg: "bg-purple-500",
    textColor: "text-purple-600",
    activeSidebarStyle: "bg-purple-50 text-purple-600 font-semibold",
    allowedProfiles: ['student'],
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard/student" },
      { id: "planner", label: "Study Planner", icon: <Calendar className="w-4 h-4" />, path: "/planner" },
      { id: "budget", label: "Budget Tracker", icon: <Calculator className="w-4 h-4" />, path: "/budget" },
      { id: "tasks", label: "My Tasks", icon: <CheckCircle2 className="w-4 h-4" />, path: "/tasks" },
      { id: "ia", label: "IA Assistant", icon: <Bot className="w-4 h-4" />, path: "/ai" },
    ],
  }
];

// Fallback icon for missing ones
function Building2(props: any) {
  return <BanknoteIcon {...props} />;
}
function BanknoteIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
}

export function ModuleLayout({ children, activeItem = "dashboard", onItemChange }: ModuleLayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [activeSidebarItem, setActiveSidebarItem] = useState(activeItem);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showMoreModules, setShowMoreModules] = useState(false);

  const { data: notifications } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000 }
  });

  // Auto-detect which top-level module this page belongs to
  useEffect(() => {
    if (user) {
      const allowed = MODULES.filter(m => m.allowedProfiles.includes(user.profileType as ProfileType));
      let foundParentId = allowed[0]?.id; // default to first allowed
      
      for (const mod of allowed) {
        if (mod.items.some(item => item.id === activeItem || item.path === window.location.pathname)) {
          foundParentId = mod.id;
          break;
        }
      }
      setActiveModuleId(foundParentId);
    }
  }, [activeItem, user]);

  if (!user) return null;

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  
  const allowedModules = MODULES.filter(m => m.allowedProfiles.includes(user.profileType as ProfileType));
  const activeModule = allowedModules.find((m) => m.id === activeModuleId) || allowedModules[0];
  const visibleModules = allowedModules.slice(0, 7);
  const moreModules = allowedModules.slice(7);

  const handleModuleClick = (moduleId: string) => {
    const mod = allowedModules.find(m => m.id === moduleId);
    if (!mod) return;
    
    setActiveModuleId(moduleId);
    setShowMoreModules(false);
    
    // Auto navigate to the first item if it has a path
    if (mod.items.length > 0) {
      setActiveSidebarItem(mod.items[0].id);
      if (mod.items[0].path) {
        setLocation(mod.items[0].path);
      }
    }
  };

  const handleSidebarItemClick = (item: any) => {
    setActiveSidebarItem(item.id);
    if (item.path) {
      setLocation(item.path);
    }
    onItemChange?.(activeModuleId, item.id);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* ─── TOP NAVBAR (ERP Style) ─── */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm relative z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0 mr-4 w-[208px]">
          <Link href="/" className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-gray-900 tracking-tight">Lynara</span>
          </Link>
          <button className="hidden lg:flex w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center transition-colors">
            <ChevronDown className="w-4 h-4 text-gray-600 rotate-90" />
          </button>
        </div>

        {/* Module Tabs (Horizontal scrollable) */}
        <nav className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide py-2">
          {visibleModules.map((mod) => {
            const isActive = activeModuleId === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => handleModuleClick(mod.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 border border-transparent",
                  isActive
                    ? `${mod.bg} text-white shadow-sm`
                    : `text-gray-600 hover:bg-gray-100 hover:border-gray-200`
                )}
              >
                <span className={isActive ? "text-white" : mod.textColor}>{mod.icon}</span>
                {mod.label}
              </button>
            );
          })}

          {/* Plus / More Dropdown */}
          {moreModules.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreModules(!showMoreModules)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  showMoreModules ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <LayoutDashboard className="w-4 h-4" /> Plus
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showMoreModules && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 min-w-[200px]">
                  {moreModules.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => handleModuleClick(mod.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className={mod.textColor}>{mod.icon}</span>
                      {mod.label}
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

        {/* Right: Icons + User */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <BackButton />
          <SettingsMenu />
          
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          <div className="flex items-center gap-3 pl-3 border-l border-gray-200 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{user.profileType} {user.tenantId ? '' : '(Demo)'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </div>
        </div>
      </header>

      {/* ─── BODY: Sidebar + Content ─── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Contextual Left Sidebar */}
        {activeModule && (
          <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden relative z-30">
            <div className="p-4 flex flex-col items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Modules</p>
              
              {/* large Active Module Indicator */}
              <div className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all",
                activeModule.bg
              )}>
                {activeModule.label}
              </div>
            </div>

            {/* Sidebar Items */}
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
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(isActive ? activeModule.textColor : "text-gray-400")}>
                        {item.icon}
                      </span>
                      {item.label}
                    </div>
                    {isActive && (
                      <ChevronDown className="w-4 h-4 -rotate-90 opacity-50" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Logout docked at bottom */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        )}

        {/* Main Application Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative">
          {children}
        </main>
      </div>

      {/* Notifications Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="w-full max-w-sm bg-white border-l border-gray-200 h-full relative z-10 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-display font-bold text-lg text-gray-900">Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!notifications?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                  <Bell className="w-12 h-12 text-gray-300" />
                  <p className="text-gray-500 text-sm">Vous n'avez aucune notification.</p>
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div
                    key={notif._id || notif.id}
                    className={cn(
                      "p-4 rounded-2xl border text-sm transition-all cursor-pointer hover:shadow-md",
                      notif.isRead ? "bg-white border-gray-100 opacity-60" : "bg-purple-50/30 border-purple-100 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                       <span className={cn(
                        "w-2 h-2 rounded-full",
                        notif.type === "danger" ? "bg-rose-500" :
                        notif.type === "warning" ? "bg-amber-500" :
                        notif.type === "success" ? "bg-emerald-500" :
                        "bg-blue-500"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 leading-tight">{notif.title}</h4>
                    <p className="text-gray-600 mt-1.5 leading-relaxed">{notif.message}</p>
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
