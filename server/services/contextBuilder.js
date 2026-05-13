// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import Task from "../models/Task.js";
import ActivityLog from "../models/ActivityLog.js";
import { normalizeRole } from "../utils/roleNormalization.js";

// Role: Recupere les donnees necessaires.
export async function getContext(user) {
  if (!user) {
    return {
      userType: "guest",
      timestamp: new Date(),
    };
  }

  try {
    const role = normalizeRole(user.role || user.profileType, "employee");

    if (role === "employee") {
      const tasks = await Task.find({ assignedTo: user._id }).limit(5).catch(() => []);
      const logs = await ActivityLog.find({ userId: user._id }).limit(5).catch(() => []);

      return {
        userType: "employee",
        userRole: role,
        tasks: tasks || [],
        activity: logs || [],
        timestamp: new Date(),
      };
    }

    if (role === "admin") {
      const employees = await ActivityLog.find({ tenantId: user.tenantId }).limit(10).catch(() => []);

      return {
        userType: "admin",
        userRole: role,
        teamActivity: employees || [],
        timestamp: new Date(),
      };
    }

    if (role === "comptable") {
      const tasks = await Task.find({ assignedTo: user._id }).limit(5).catch(() => []);
      const logs = await ActivityLog.find({ userId: user._id }).limit(5).catch(() => []);

      return {
        userType: "comptable",
        userRole: role,
        tasks: tasks || [],
        activity: logs || [],
        timestamp: new Date(),
      };
    }

    if (role === "stagiaire") {
      const tasks = await Task.find({ assignedTo: user._id }).limit(5).catch(() => []);
      const logs = await ActivityLog.find({ userId: user._id }).limit(5).catch(() => []);

      return {
        userType: "stagiaire",
        userRole: role,
        tasks: tasks || [],
        activity: logs || [],
        timestamp: new Date(),
      };
    }

    return {
      userType: role,
      userRole: role,
      timestamp: new Date(),
    };

  } catch (err) {
    console.error("Context builder error:", err.message);
    const role = normalizeRole(user.role || user.profileType, "employee");
    return {
      userType: role,
      userRole: role,
      timestamp: new Date(),
      error: "Context fetch failed",
    };
  }
}
