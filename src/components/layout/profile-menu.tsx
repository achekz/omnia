import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronDown, HelpCircle, LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const avatarUrl =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=7c3aed&color=fff&bold=true`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-2.5 py-2 transition",
          isOpen ? "border-violet-200 bg-violet-50" : "border-gray-200 bg-white hover:bg-gray-50",
        )}
      >
        <img src={avatarUrl} alt={user.name} className="h-9 w-9 rounded-xl object-cover ring-2 ring-white" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[150px] truncate text-sm font-bold leading-none text-gray-950">{user.name}</p>
          <p className="mt-1 text-xs capitalize text-gray-500">{user.profileType || user.role}</p>
        </div>
        <ChevronDown className={cn("hidden h-4 w-4 text-gray-400 transition sm:block", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="bg-gradient-to-br from-violet-600 to-pink-500 p-5 text-white">
            <div className="flex items-center gap-3">
              <img src={avatarUrl} alt={user.name} className="h-14 w-14 rounded-2xl object-cover ring-4 ring-white/20" />
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-sm text-white/80">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <MenuLink href="/settings" icon={<UserRound className="h-4 w-4" />} label="Profile settings" onClick={() => setIsOpen(false)} />
            <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />} label="Workspace settings" onClick={() => setIsOpen(false)} />
            <MenuLink href="/help" icon={<HelpCircle className="h-4 w-4" />} label="Help center" onClick={() => setIsOpen(false)} />
            <div className="my-2 h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
      <span className="text-gray-400">{icon}</span>
      {label}
    </Link>
  );
}
