import { useState, type FormEvent } from "react";
import { ClipboardList, Clock, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useCreateTask, useGetAdminTasks, useGetAdminUsers } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

function getUserName(user: Partial<User> | string | undefined) {
  if (!user || typeof user === "string") return "-";
  return user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "-";
}

export default function AdminTasksPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [startTime, setStartTime] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(60);
  const { toast } = useToast();
  const createTask = useCreateTask();
  const { data: users = [] } = useGetAdminUsers();
  const { data: tasks = [], isLoading } = useGetAdminTasks({ query: { refetchInterval: 30000 } });

  const assignableUsers = users.filter((user) => ["employee", "stagiaire", "comptable"].includes(user.role));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedTo) {
      toast({ title: "Assigned user required", description: "Choose an employee, stagiaire, or comptable.", variant: "destructive" });
      return;
    }

    try {
      await createTask.mutateAsync({
        title,
        description,
        assignedTo,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        estimatedDuration,
        estimatedDurationMinutes: estimatedDuration,
        estimatedMinutes: estimatedDuration,
      });
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setStartTime("");
      setEstimatedDuration(60);
      toast({ title: "Task assigned", description: "The user was notified in real time." });
    } catch (error: any) {
      toast({ title: "Task creation failed", description: error?.response?.data?.message || "Could not create task.", variant: "destructive" });
    }
  };

  return (
    <ModuleLayout activeItem="admin-tasks">
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-950 dark:text-gray-100">Task Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Assign tasks and track start, finish, and delay.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-5">
          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} placeholder="Title" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2" />
          <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900">
            <option value="">Assign to</option>
            {assignableUsers.map((user) => (
              <option key={user._id || user.id} value={user._id || user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
          <input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900" />
          <input type="number" min={1} max={1440} value={estimatedDuration} onChange={(event) => setEstimatedDuration(Number(event.target.value))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="min-h-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-900 lg:col-span-4" />
          <button disabled={createTask.isPending} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            <Plus className="h-4 w-4" />
            Create
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-5 py-4">Task</th>
                <th className="px-5 py-4">Assigned to</th>
                <th className="px-5 py-4">Start time</th>
                <th className="px-5 py-4">Estimated</th>
                <th className="px-5 py-4">Started</th>
                <th className="px-5 py-4">Finished</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Delayed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={8}>Loading tasks...</td>
                </tr>
              ) : tasks.length ? (
                tasks.map((task) => (
                  <tr key={task._id || task.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-950 dark:text-gray-100">{task.title}</p>
                      {task.description && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{task.description}</p>}
                    </td>
                    <td className="px-5 py-4">{getUserName(task.assignedTo as Partial<User>)}</td>
                    <td className="px-5 py-4">{task.startTime ? new Date(task.startTime).toLocaleString() : "-"}</td>
                    <td className="px-5 py-4">{task.estimatedMinutes || task.estimatedDurationMinutes || 0} min</td>
                    <td className="px-5 py-4">{task.actualStartedAt ? new Date(task.actualStartedAt).toLocaleString() : "-"}</td>
                    <td className="px-5 py-4">{task.actualFinishedAt || task.completedAt ? new Date(task.actualFinishedAt || task.completedAt || "").toLocaleString() : "-"}</td>
                    <td className="px-5 py-4 capitalize">{task.status.replace("_", " ")}</td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", task.isDelayed ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                        <Clock className="h-3 w-3" />
                        {task.isDelayed ? "Delayed" : "On track"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-gray-500" colSpan={8}>No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleLayout>
  );
}
