import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, Briefcase, BarChart3, Settings,
  Users2, FileText, ShieldAlert, CheckSquare, BrainCircuit,
  GraduationCap, BookOpen, Wallet, Bell, Menu, X, LogOut, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useGetNotifications } from "@/lib/api-client";
import { BackButton } from "@/components/ui/back-button";
import { SettingsMenu } from "@/components/ui/settings-menu";

interface SharedLayoutProps {
  children: ReactNode;
}

export function SharedLayout({ children }: SharedLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const { data: notifications, isLoading: isLoadingNotifs } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000 }
  });

  if (!user) return null;

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const getNavLinks = () => {
    switch (user.profileType) {
      case 'company':
        return [
          { name: 'Dashboard', path: '/dashboard/company', icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: 'Team', path: '#', icon: <Users className="w-5 h-5" /> },
          { name: 'Projects', path: '#', icon: <Briefcase className="w-5 h-5" /> },
          { name: 'Analytics', path: '#', icon: <BarChart3 className="w-5 h-5" /> },
        ];
      case 'cabinet':
        return [
          { name: 'Dashboard', path: '/dashboard/cabinet', icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: 'Clients', path: '#', icon: <Users2 className="w-5 h-5" /> },
          { name: 'Finance', path: '#', icon: <FileText className="w-5 h-5" /> },
          { name: 'Anomalies', path: '#', icon: <ShieldAlert className="w-5 h-5" /> },
        ];
      case 'employee':
        return [
          { name: 'Dashboard', path: '/dashboard/employee', icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: 'My Tasks', path: '#', icon: <CheckSquare className="w-5 h-5" /> },
          { name: 'AI Insights', path: '#', icon: <BrainCircuit className="w-5 h-5" /> },
        ];
      case 'student':
        return [
          { name: 'Dashboard', path: '/dashboard/student', icon: <LayoutDashboard className="w-5 h-5" /> },
          { name: 'Study Plan', path: '#', icon: <BookOpen className="w-5 h-5" /> },
          { name: 'Exams', path: '#', icon: <GraduationCap className="w-5 h-5" /> },
          { name: 'Budget', path: '#', icon: <Wallet className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-sm",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight gradient-text">OmniAI</span>
        </div>

        <div className="px-6 pb-4">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3">
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
              alt={user.name}
              className="w-10 h-10 rounded-lg object-cover bg-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.profileType}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location === link.path;
            return (
              <Link key={link.name} href={link.path} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                isActive 
                  ? "gradient-bg text-white shadow-md shadow-purple-500/20" 
                  : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
              )}>
                {link.icon}
                {link.name}
              </Link>
            );
          })}
          
          {/* Spacer for flex-1 to push preferences to bottom */}
        </nav>

        {/* Preferences Section at Bottom - REMOVED Settings & Logout, now in header dropdown */}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-gray-200 z-30 px-4 md:px-8 flex items-center justify-between sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-500 hover:text-gray-900">
              <Menu className="w-6 h-6" />
            </button>
            <BackButton />
            <h1 className="font-display text-xl font-bold text-gray-900 hidden sm:block">Welcome back, {user.name.split(' ')[0]} 👋</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <SettingsMenu />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Notifications Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="w-full max-w-sm bg-white border-l border-gray-200 h-full relative z-10 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-display font-bold text-lg text-gray-900">Notifications</h3>
              <button onClick={() => setIsNotifOpen(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingNotifs ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
              ) : notifications?.length === 0 ? (
                <p className="text-center text-gray-500 p-8">No new notifications</p>
              ) : (
                notifications?.map(notif => (
                  <div key={notif.id} className={cn(
                    "p-4 rounded-xl border transition-colors",
                    notif.isRead ? "bg-gray-50 border-transparent opacity-70" : "bg-purple-50/50 border-purple-100"
                  )}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                        notif.type === 'danger' ? "bg-rose-100 text-rose-700" :
                        notif.type === 'warning' ? "bg-amber-100 text-amber-700" :
                        notif.type === 'success' ? "bg-emerald-100 text-emerald-700" :
                        "bg-blue-100 text-blue-700"
                      )}>{notif.type}</span>
                      <span className="text-xs text-gray-500">Just now</span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 mt-2">{notif.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
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

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}