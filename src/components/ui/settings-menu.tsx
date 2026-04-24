import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { 
  Settings, LogOut, HelpCircle, Palette, User as UserIcon, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { DisplayAccessibilityModal } from "./display-accessibility-modal";

interface MenuItem {
  icon?: React.ReactNode;
  label?: string;
  action?: () => void;
  link?: string;
  divider?: boolean;
  color?: string;
  onModalOpen?: () => void;
}

export function SettingsMenu() {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showDisplayModal, setShowDisplayModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems: MenuItem[] = [
    {
      icon: <UserIcon className="w-4 h-4" />,
      label: "Account Settings",
      link: "/settings",
    },
    {
      icon: <Palette className="w-4 h-4" />,
      label: "Display & Accessibility",
      onModalOpen: () => {
        setShowDisplayModal(true);
        setIsOpen(false);
      },
    },
    { divider: true },
    {
      icon: <HelpCircle className="w-4 h-4" />,
      label: "Help Center",
      link: "/help",
    },
    { divider: true },
    {
      icon: <LogOut className="w-4 h-4" />,
      label: "Log Out",
      action: logout,
      color: "text-rose-600",
    },
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
      setIsOpen(false);
    } else if (item.onModalOpen) {
      item.onModalOpen();
    } else if (item.link) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2.5 rounded-full transition-all duration-200",
          isOpen
            ? "bg-purple-100 text-purple-700 border border-purple-300"
            : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Settings</h3>
          </div>

          {/* Menu Items */}
          <div className="py-2 max-h-96 overflow-y-auto">
            {menuItems.map((item, idx) => {
              if (item.divider) {
                return <div key={idx} className="my-2 h-px bg-gray-100" />;
              }

              const content = (
                <div className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700 group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors", item.color)}>
                      {item.icon}
                    </span>
                    <span className={cn("text-gray-700 group-hover:text-gray-900", item.color)}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100" />
                </div>
              );

              if (item.link) {
                return (
                  <Link key={idx} href={item.link} onClick={() => handleMenuItemClick(item)}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleMenuItemClick(item)}
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <DisplayAccessibilityModal isOpen={showDisplayModal} onClose={() => setShowDisplayModal(false)} />
    </div>
  );
}
