import { useState, type FormEvent } from "react";
import { AlignLeft, CheckCircle2, Clock, MoreVertical, Play, Plus } from "lucide-react";
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

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No tasks found</h3>
              <p className="text-gray-500 dark:text-gray-400">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const taskId = task._id || task.id;
                const nextStatus: TaskStatus =
                  task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";

                return (
                  <div key={taskId} className="group p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-start gap-4">
                    <button
                      onClick={() => {
                        if (taskId) {
                          updateTask.mutate({ id: taskId, data: { status: nextStatus } });
                        }
                      }}
                      className="mt-0.5 shrink-0"
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : task.status === "in_progress" ? (
                        <Play className="w-5 h-5 text-purple-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium truncate transition-all duration-200",
                          task.status === "done" ? "text-gray-400 dark:text-gray-600 line-through" : "text-gray-900 dark:text-gray-100",
                        )}
                      >
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                        {task.priority && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded font-medium",
                              task.priority === "critical"
                                ? "bg-rose-50 text-rose-700"
                                : task.priority === "high"
                                  ? "bg-orange-50 text-orange-700"
                                  : task.priority === "medium"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
                            )}
                          >
                            {task.priority}
                          </span>
                        )}

                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}

                        {task.description && (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <AlignLeft className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
