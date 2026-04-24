import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { AlertCircle, CheckSquare, Flame, Plus } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { MLInsightCard } from "@/components/ui/ml-insight-card";
import { StatCard } from "@/components/ui/stat-card";
import { useGetDashboardStats, useGetTasks, useMlInsights, useUpdateTask } from "@/lib/api-client";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: serverTasks = [], refetch } = useGetTasks();
  const { mutate: updateTask } = useUpdateTask();
  const { data: insights, isLoading: loadingInsights } = useMlInsights();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(serverTasks);
  }, [serverTasks]);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const draggedTask = tasks.find((task) => (task._id || task.id) === draggableId);
    if (!draggedTask) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const nextTasks = tasks.map((task) =>
      (task._id || task.id) === (draggedTask._id || draggedTask.id) ? { ...task, status: newStatus } : task,
    );

    setTasks(nextTasks);

    const taskId = draggedTask._id || draggedTask.id;
    if (taskId) {
      updateTask(
        { id: taskId, data: { status: newStatus } },
        {
          onError: () => {
            void refetch();
          },
        },
      );
    }
  };

  return (
    <ModuleLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-white">My Workspace</h2>
          <p className="text-muted-foreground dark:text-gray-400 mt-1">Manage your tasks and view productivity insights.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center border-primary/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <p className="text-sm font-medium text-muted-foreground dark:text-gray-400 z-10">Daily AI Score</p>
          <div className="mt-2 flex items-baseline gap-1 z-10">
            <span className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {stats?.currentScore || 92}
            </span>
            <span className="text-muted-foreground dark:text-gray-300">/100</span>
          </div>
        </div>

        <StatCard title="Tasks Done Today" value={stats?.completedTasks || 5} icon={<CheckSquare className="w-8 h-8 text-emerald-400" />} delay={0.1} />
        <StatCard title="Overdue Tasks" value={stats?.overdueTasks || 0} icon={<AlertCircle className="w-8 h-8 text-rose-400" />} delay={0.2} />
        <StatCard title="Day Streak" value={stats?.streak || 14} icon={<Flame className="w-8 h-8 text-amber-400" />} delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Task Board</h3>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);

                return (
                  <div key={column.id} className="glass-panel rounded-xl border border-white/5 flex flex-col h-[500px]">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <h4 className="font-semibold text-white">{column.title}</h4>
                      <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">{columnTasks.length}</span>
                    </div>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn("flex-1 p-3 overflow-y-auto space-y-3 transition-colors", snapshot.isDraggingOver ? "bg-white/5" : "")}
                        >
                          {columnTasks.map((task, index) => {
                            const taskId = task._id || task.id || `${column.id}-${index}`;

                            return (
                              <Draggable key={taskId} draggableId={String(taskId)} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={cn(
                                      "bg-card border p-4 rounded-xl shadow-lg transition-all",
                                      dragSnapshot.isDragging ? "border-primary glow-shadow scale-105" : "border-white/10 hover:border-white/20",
                                    )}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                          task.priority === "high" || task.priority === "critical"
                                            ? "bg-rose-500/20 text-rose-400"
                                            : task.priority === "medium"
                                              ? "bg-amber-500/20 text-amber-400"
                                              : "bg-blue-500/20 text-blue-400",
                                        )}
                                      >
                                        {task.priority || "low"}
                                      </span>
                                    </div>
                                    <h5 className="font-medium text-sm text-white mb-2 leading-tight">{task.title}</h5>
                                    {task.dueDate && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
          <div className="space-y-4">
            {insights?.latestRecommendation?.recommendations?.map((recommendation, index) => (
              <MLInsightCard
                key={`${recommendation}-${index}`}
                type="recommendation"
                prediction={recommendation}
                confidence={insights.latestRecommendation?.confidence || 85}
              />
            ))}
            {!loadingInsights && !insights?.latestRecommendation?.recommendations?.length && (
              <MLInsightCard
                type="prediction"
                prediction="Keep up the good work! We're analyzing your latest activity."
                confidence={94}
                className="border-primary/20 bg-primary/5"
              />
            )}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
