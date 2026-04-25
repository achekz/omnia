import Task from "../models/Task.js";
import ActivityLog from "../models/ActivityLog.js";

export async function getContext(user) {
  if (!user) {
    return {
      userType: "guest",
      timestamp: new Date(),
    };
  }

  try {
  if (user.role === "EMPLOYEE") {
      const tasks = await Task.find({ assignedTo: user._id }).limit(5).catch(() => []);
      const logs = await ActivityLog.find({ userId: user._id }).limit(5).catch(() => []);

      return {
        userType: "employee",
        userRole: user.role,
        tasks: tasks || [],
        activity: logs || [],
        timestamp: new Date(),
      };
    }

  if (user.role === "COMPANY_ADMIN") {
      const employees = await ActivityLog.find({ tenantId: user.tenantId }).limit(10).catch(() => []);

      return {
        userType: "company_admin",
        userRole: user.role,
        teamActivity: employees || [],
        timestamp: new Date(),
      };
    }

  if (user.role === "CABINET_ADMIN") {
      return {
        userType: "cabinet_admin",
        userRole: user.role,
        message: "Financial data and client information available",
        timestamp: new Date(),
      };
    }

  if (user.role === "STUDENT") {
      const tasks = await Task.find({ assignedTo: user._id }).limit(5).catch(() => []);

      return {
        userType: "student",
        userRole: user.role,
        studyTasks: tasks || [],
        timestamp: new Date(),
      };
    }

    // Default for other roles
    return {
      userType: user.role || "USER",
      userRole: user.role,
      timestamp: new Date(),
    };

  } catch (err) {
    console.error("Context builder error:", err.message);
    return {
      userType: user.role || "user",
      userRole: user.role,
      timestamp: new Date(),
      error: "Context fetch failed",
    };
  }
}
