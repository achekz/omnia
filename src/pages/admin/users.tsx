// Role du fichier: affiche une page reservee au compte admin.
import { Check, Eye, ShieldQuestion, Trash2, Users, X } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useApproveRoleChangeRequest, useDeleteAdminUser, useGetAdminRoleChangeRequests, useGetAdminUsers, useRejectRoleChangeRequest } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { RoleChangeRequest, User } from "@/lib/types";

// Role: Affiche et organise cet ecran.
export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useGetAdminUsers();
  const { data: roleRequests = [], isLoading: isLoadingRequests } = useGetAdminRoleChangeRequests("pending", { query: { refetchInterval: 30000 } });
  const deleteUser = useDeleteAdminUser();
  const approveRoleRequest = useApproveRoleChangeRequest();
  const rejectRoleRequest = useRejectRoleChangeRequest();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const visibleUsers = users.filter((user) => user.role !== "admin");

  // Role: Traite une action utilisateur.
  const handleDelete = async (id?: string, label?: string) => {
    if (!id) return;
    const confirmed = window.confirm(`Delete ${label || "ce compte"} et tous les enregistrements liés ?`);
    if (!confirmed) return;

    try {
      await deleteUser.mutateAsync(id);
      toast({ title: "Account deleted", description: "The user and related records were removed." });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.response?.data?.message || "Could not delete this account.", variant: "destructive" });
    }
  };

  const handleApproveRoleRequest = async (requestId?: string) => {
    if (!requestId) return;
    try {
      await approveRoleRequest.mutateAsync(requestId);
      toast({ title: "Demande acceptée", description: "Le rôle du compte a été modifié." });
    } catch (error: any) {
      toast({ title: "Action échouée", description: error?.response?.data?.message || "Impossible d'accepter cette demande.", variant: "destructive" });
    }
  };

  const handleRejectRoleRequest = async (requestId?: string) => {
    if (!requestId) return;
    try {
      await rejectRoleRequest.mutateAsync({ id: requestId });
      toast({ title: "Demande refusée", description: "L'utilisateur a été notifié." });
    } catch (error: any) {
      toast({ title: "Action échouée", description: error?.response?.data?.message || "Impossible de refuser cette demande.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="users">
      <div className="container-fluid p-3 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-950 dark:text-gray-100 sm:text-3xl">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">All les comptes de l'espace de travail.</p>
          </div>
        </div>

        <RoleRequestsPanel
          requests={roleRequests}
          isLoading={isLoadingRequests}
          isBusy={approveRoleRequest.isPending || rejectRoleRequest.isPending}
          onApprove={handleApproveRoleRequest}
          onReject={handleRejectRoleRequest}
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="table-responsive overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-5 py-4">First name</th>
                <th className="px-5 py-4">Last name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Created at</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={6}>Loading users...</td>
                </tr>
              ) : visibleUsers.length ? (
                visibleUsers.map((user) => (
                  <tr key={user._id || user.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-5 py-4 font-semibold">{user.firstName}</td>
                    <td className="px-5 py-4 font-semibold">{user.lastName}</td>
                    <td className="px-5 py-4">{user.email}</td>
                    <td className="px-5 py-4 capitalize">{user.role}</td>
                    <td className="px-5 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setLocation(`/admin/users/${user._id || user.id}`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                        <button
                          type="button"
                          disabled={deleteUser.isPending}
                          onClick={() => void handleDelete(user._id || user.id, user.name || user.email)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={6}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

function RoleRequestsPanel({
  requests,
  isLoading,
  isBusy,
  onApprove,
  onReject,
}: {
  requests: RoleChangeRequest[];
  isLoading: boolean;
  isBusy: boolean;
  onApprove: (id?: string) => void;
  onReject: (id?: string) => void;
}) {
  if (isLoading && !requests.length) {
    return (
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        Loading role change requests...
      </div>
    );
  }

  if (!requests.length) {
    return null;
  }

  return (
    <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10">
      <div className="mb-3 flex items-center gap-2">
        <ShieldQuestion className="h-5 w-5 text-amber-700 dark:text-amber-200" />
        <h2 className="text-base font-bold text-amber-900 dark:text-amber-100">Demandes de changement de rôle</h2>
      </div>
      <div className="space-y-3">
        {requests.map((request) => {
          const account = getRequestUser(request);
          const id = request._id || request.id;

          return (
            <article key={id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm dark:border-amber-400/20 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-gray-950 dark:text-gray-100">{account.name || `${account.firstName || ""} ${account.lastName || ""}`.trim() || account.email || "Utilisateur"}</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  <span className="capitalize">{request.currentRole}</span> → <span className="font-bold capitalize text-amber-700 dark:text-amber-200">{request.requestedRole}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">{request.createdAt ? new Date(request.createdAt).toLocaleString() : account.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onApprove(id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  Accepter
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onReject(id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Refuser
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getRequestUser(request: RoleChangeRequest): Partial<User> {
  return request.userId && typeof request.userId === "object" ? request.userId : {};
}
