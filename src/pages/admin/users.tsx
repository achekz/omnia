import { Users } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useGetAdminUsers } from "@/lib/api-client";

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useGetAdminUsers();

  return (
    <ModuleLayout activeItem="users">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">All workspace accounts.</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={5}>Loading users...</td>
                </tr>
              ) : users.length ? (
                users.map((user) => (
                  <tr key={user._id || user.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-5 py-4 font-semibold">{user.firstName}</td>
                    <td className="px-5 py-4 font-semibold">{user.lastName}</td>
                    <td className="px-5 py-4">{user.email}</td>
                    <td className="px-5 py-4 capitalize">{user.role}</td>
                    <td className="px-5 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
