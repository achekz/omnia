import { useState, type FormEvent } from "react";
import { AlignLeft, AlertTriangle, CheckCircle2, Clock, Play, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { useCreateTask, useGetTasks, useUpdateTask } from "@/lib/api-client";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data: tasks = [], isLoading } = useGetTasks();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();

  const filteredTasks = tasks.filter((task) => (filter === "all" ? true : task.status === filter));
  const kanbanColumns: { id: TaskStatus; title: string }[] = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "overdue", title: "Overdue" },
    { id: "done", title: "Done" },
  ];

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) {
      return;
    }

    createTask.mutate({ title: newTaskTitle, status: "todo" });
    setNewTaskTitle("");
  };

  return (
    <ModuleLayout activeItem="tasks">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">My Tasks</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your pending actions and assignments.</p>
          </div>

          <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            {(["all", "todo", "in_progress", "done"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors",
                  filter === value
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800",
                )}
              >
                {value.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateTask} className="mb-8">
          <div className="relative flex items-center">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="What needs to be done?"
              className="w-full pl-4 pr-12 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || createTask.isPending}
              className="absolute right-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-4">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 lg:col-span-4">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center rounded-2xl border border-gray-200 bg-white lg:col-span-4">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No tasks found</h3>
              <p className="text-gray-500 dark:text-gray-400">You&apos;re all caught up!</p>
            </div>
          ) : (
            kanbanColumns.map((column) => {
              const columnTasks = filteredTasks.filter((task) => task.status === column.id);

              return (
                <section key={column.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between px-2 py-1">
                    <h3 className="font-bold text-gray-950">{column.title}</h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{columnTasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {columnTasks.map((task) => {
                      const taskId = task._id || task.id;
                      const nextStatus: TaskStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";

                      return (
                        <article
                          key={taskId}
                          className={cn(
                            "rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                            task.status === "overdue" || (task.delayDays || 0) > 0
                              ? "border-rose-200 bg-rose-50"
                              : "border-gray-200 bg-white",
                          )}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <p className={cn("font-semibold leading-tight", task.status === "done" ? "text-gray-400 line-through" : "text-gray-950")}>{task.title}</p>
                            <button
                              onClick={() => taskId && updateTask.mutate({ id: taskId, data: { status: nextStatus } })}
                              className="shrink-0 rounded-full bg-gray-50 p-1.5 text-gray-500 hover:bg-purple-50 hover:text-purple-700"
                              title="Move status"
                            >
                              {task.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : task.status === "in_progress" ? <Play className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2 border-current" />}
                            </button>
                          </div>
                          {task.description && <p className="mb-3 text-sm text-gray-500 line-clamp-3">{task.description}</p>}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {task.priority && <PriorityBadge priority={task.priority} />}
                            {task.dueDate && (
                              <span className={cn("flex items-center gap-1", task.status === "overdue" || (task.delayDays || 0) > 0 ? "font-semibold text-rose-700" : "text-gray-500")}>
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {(task.delayDays || 0) > 0 && (
                              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                                <AlertTriangle className="h-3 w-3" />
                                {task.delayDays}d late
                              </span>
                            )}
                            {task.description && <AlignLeft className="h-3.5 w-3.5 text-gray-400" />}
                          </div>
                        </article>
                      );
                    })}
                    {!columnTasks.length && <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Empty</div>}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-bold uppercase tracking-wide",
        priority === "critical"
          ? "bg-rose-100 text-rose-700"
          : priority === "high"
            ? "bg-orange-100 text-orange-700"
            : priority === "medium"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600",
      )}
    >
      {priority}
    </span>
  );
}
