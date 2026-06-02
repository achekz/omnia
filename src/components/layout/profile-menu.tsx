// Role du fichier: structure la mise en page et la navigation globale.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronDown, HelpCircle, LogOut, Monitor, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { DisplayAccessibilityModal } from "@/components/ui/display-accessibility-modal";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
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
          isOpen
            ? "border-violet-300 bg-violet-50 dark:border-violet-400/40 dark:bg-violet-500/15"
            : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
        )}
      >
        <img src={avatarUrl} alt={user.name} className="h-9 w-9 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[150px] truncate text-sm font-bold leading-none text-slate-950 dark:text-slate-100">{user.name}</p>
          <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">{user.profileType || user.role}</p>
        </div>
        <ChevronDown className={cn("hidden h-4 w-4 text-slate-500 transition sm:block dark:text-slate-400", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,20rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/60 animate-in fade-in slide-in-from-top-2 dark:border-slate-700 dark:bg-slate-950 dark:shadow-slate-950/60">
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
            <MenuButton
              icon={<Monitor className="h-4 w-4" />}
              label="Theme"
              onClick={() => {
                setIsOpen(false);
                setShowThemeModal(true);
              }}
            />
            <MenuLink href="/help" icon={<HelpCircle className="h-4 w-4" />} label="Help center" onClick={() => setIsOpen(false)} />
            <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}

      <DisplayAccessibilityModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
      <span className="text-slate-500 dark:text-slate-500">{icon}</span>
      {label}
    </Link>
  );
}

function MenuButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
    >
      <span className="text-slate-500 dark:text-slate-500">{icon}</span>
      {label}
    </button>
  );
}
