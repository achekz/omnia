import Task from "../models/Task.js";
import ActivityLog from "../models/ActivityLog.js";

export async function getContext(user) {
  if (user.role === "employee") {
    const tasks = await Task.find({ assignedTo: user._id }).limit(5);
    const logs = await ActivityLog.find({ userId: user._id }).limit(5);

    return {
      tasks,
      activity: logs,
    };
  }

  if (user.role === "company_admin") {
    const employees = await ActivityLog.find({ tenantId: user.tenantId });

    return {
      teamActivity: employees,
    };
  }

  if (user.role === "cabinet_admin") {
    return {
      message: "Financial data available",
    };
  }

  if (user.role === "student") {
    const tasks = await Task.find({ assignedTo: user._id });

    return {
      studyTasks: tasks,
    };
  }

  return {};
}