import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Bot, CheckCheck, Circle, Coins, Loader2, Trash2, X } from "lucide-react";
import {
  useClearReadNotifications,
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/api-client";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

type NotificationCategory = "all" | "ml" | "tasks" | "finance";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const filters: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ml", label: "ML alerts" },
  { id: "tasks", label: "Tasks" },
  { id: "finance", label: "Finance" },
];

export function getNotificationCategory(notification: Notification): NotificationCategory {
  const source = String(notification.source || "").toLowerCase();
  const text = `${notification.title} ${notification.message} ${notification.actionUrl || ""}`.toLowerCase();

  if (source === "ml" || text.includes("risk") || text.includes("anomaly") || text.includes("ai")) return "ml";
  if (text.includes("finance") || text.includes("financial") || text.includes("budget") || text.includes("expense")) return "finance";
  if (text.includes("task") || text.includes("/tasks") || source === "rule_engine") return "tasks";
  return "all";
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<NotificationCategory>("all");
  const { data: notifications = [], isFetching, isError } = useGetNotifications({
    query: { enabled: isOpen, refetchInterval: 30000 },
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const clearRead = useClearReadNotifications();

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const filteredNotifications = useMemo(
    () =>
      activeFilter === "all"
        ? notifications
        : notifications.filter((notification) => getNotificationCategory(notification) === activeFilter),
    [activeFilter, notifications],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right">
        <header className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                <Bell className="h-3.5 w-3.5" />
                Notification history
              </div>
              <h2 className="text-xl font-bold text-slate-950">Alerts center</h2>
              <p className="text-sm text-slate-500">{unreadCount} unread alert{unreadCount === 1 ? "" : "s"} synced from MongoDB.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-white p-1 shadow-sm">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "rounded-xl px-2 py-2 text-xs font-bold transition",
                  activeFilter === filter.id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={!unreadCount || markAllRead.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => clearRead.mutate()}
              disabled={clearRead.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              title="Clear read notifications"
            >
              {clearRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {isFetching && !notifications.length ? (
            <NotificationSkeleton />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Unable to load notifications. Please retry in a moment.
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-8 text-center">
              <Bell className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-900">No notifications here</p>
              <p className="mt-1 text-sm text-slate-500">New ML, task and finance alerts will appear in this history.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification._id ?? notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  isUpdating={markRead.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
  isUpdating,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  isUpdating: boolean;
}) {
  const category = getNotificationCategory(notification);
  const id = notification._id || notification.id;
  const categoryMeta = {
    ml: { label: "ML alert", icon: <Bot className="h-4 w-4" />, tone: "bg-violet-50 text-violet-700 border-violet-100" },
    tasks: { label: "Task", icon: <Circle className="h-4 w-4" />, tone: "bg-sky-50 text-sky-700 border-sky-100" },
    finance: { label: "Finance", icon: <Coins className="h-4 w-4" />, tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    all: { label: "System", icon: <Bell className="h-4 w-4" />, tone: "bg-slate-50 text-slate-700 border-slate-100" },
  }[category];

  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        notification.isRead ? "border-slate-200 bg-white opacity-75" : "border-violet-200 bg-violet-50/30",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold", categoryMeta.tone)}>
          {categoryMeta.icon}
          {categoryMeta.label}
        </span>
        <span className="text-xs font-medium text-slate-400">{formatNotificationDate(notification.createdAt)}</span>
      </div>
      <div className="flex gap-3">
        <div className={cn("mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", severityTone(notification.type))}>
          {notification.type === "danger" || notification.type === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight text-slate-950">{notification.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{notification.message}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", notification.isRead ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-700")}>
              {notification.isRead ? "Read" : "Unread"}
            </span>
            {!notification.isRead && id && (
              <button
                type="button"
                onClick={() => onMarkRead(id)}
                disabled={isUpdating}
                className="text-xs font-bold text-violet-700 transition hover:text-violet-900 disabled:opacity-50"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-slate-200 p-4">
          <div className="mb-4 h-5 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function severityTone(type: Notification["type"]) {
  if (type === "danger") return "bg-rose-100 text-rose-700";
  if (type === "warning") return "bg-amber-100 text-amber-700";
  if (type === "success") return "bg-emerald-100 text-emerald-700";
  return "bg-blue-100 text-blue-700";
}

function formatNotificationDate(value?: string) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
