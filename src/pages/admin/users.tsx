// Role du fichier: affiche une page reservee au compte admin.
import { Eye, Trash2, Users } from "lucide-react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useDeleteAdminUser, useGetAdminUsers } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

// Role: Affiche et organise cet ecran.
export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useGetAdminUsers();
  const deleteUser = useDeleteAdminUser();
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

  return (
    <ModuleLayout activeItem="users">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">All les comptes de l'espace de travail.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
                          onClick={() => setLocation(`/admin/users/${user._id || user.id}/tasks`)}
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
    </ModuleLayout>
  );
}
