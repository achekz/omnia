// Role du fichier: affiche une page React de l application.
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useApproveRoleChangeRequest, useGetAdminRoleChangeRequests, useGetNotifications, useMarkNotificationRead, useRejectRoleChangeRequest } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Notification, RoleChangeRequest } from "@/lib/types";

// Role: Affiche et organise cet ecran.
export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: notifications = [], isFetching } = useGetNotifications({ query: { refetchInterval: 30000 } });
  const { data: pendingRoleRequests = [] } = useGetAdminRoleChangeRequests("pending", { query: { enabled: user?.role === "admin", refetchInterval: 30000 } });
  const markRead = useMarkNotificationRead();
  const approveRoleRequest = useApproveRoleChangeRequest();
  const rejectRoleRequest = useRejectRoleChangeRequest();
  const { toast } = useToast();

  const handleApprove = async (id: string) => {
    try {
      await approveRoleRequest.mutateAsync(id);
      toast({ title: "Demande acceptée", description: "Le rôle du compte a été modifié." });
    } catch (error: any) {
      toast({ title: "Action échouée", description: error?.response?.data?.message || "Impossible d'accepter cette demande.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRoleRequest.mutateAsync({ id });
      toast({ title: "Demande refusée", description: "L'utilisateur a été notifié." });
    } catch (error: any) {
      toast({ title: "Action échouée", description: error?.response?.data?.message || "Impossible de refuser cette demande.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="notifications">
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Real-time</p>
          <h1 className="mt-2 text-3xl font-display font-bold text-gray-950">Notifications</h1>
          <p className="mt-2 text-gray-500">Alerts stored in MongoDB and updated through Socket.IO.</p>
        </div>

        <div className="space-y-3">
          {isFetching && !notifications.length ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading notifications...</div>
          ) : notifications.length ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification._id || notification.id}
                notification={notification}
                pendingRoleRequests={pendingRoleRequests}
                isRoleActionBusy={approveRoleRequest.isPending || rejectRoleRequest.isPending}
                onApproveRoleRequest={handleApprove}
                onRejectRoleRequest={handleReject}
                onRead={(id) => markRead.mutate(id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-semibold text-gray-950">No notifications yet</p>
              <p className="mt-1 text-sm text-gray-500">Real rule-engine alerts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}

// Role: Affiche et organise cet ecran.
function NotificationRow({
  notification,
  pendingRoleRequests,
  isRoleActionBusy,
  onApproveRoleRequest,
  onRejectRoleRequest,
  onRead,
}: {
  notification: Notification;
  pendingRoleRequests: RoleChangeRequest[];
  isRoleActionBusy: boolean;
  onApproveRoleRequest: (id: string) => void;
  onRejectRoleRequest: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const id = notification._id || notification.id;
  const roleRequestId = typeof notification.metadata?.roleChangeRequestId === "string" ? notification.metadata.roleChangeRequestId : "";
  const pendingRoleRequest = pendingRoleRequests.find((request) => (request._id || request.id) === roleRequestId);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            <Bell className="h-3.5 w-3.5" />
            {notification.source || "system"}
          </div>
          <h2 className="font-bold text-gray-950">{notification.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
          {(notification.redirectTarget || notification.actionUrl) && (
            <p className="mt-2 text-xs font-semibold text-gray-400">{notification.redirectTarget || notification.actionUrl}</p>
          )}
          {pendingRoleRequest && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isRoleActionBusy}
                onClick={() => onApproveRoleRequest(roleRequestId)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Accepter
              </button>
              <button
                type="button"
                disabled={isRoleActionBusy}
                onClick={() => onRejectRoleRequest(roleRequestId)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
            </div>
          )}
        </div>
        {!notification.isRead && id && (
          <button
            type="button"
            onClick={() => onRead(id)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark read
          </button>
        )}
      </div>
    </article>
  );
}
