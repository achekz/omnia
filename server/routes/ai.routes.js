// Role du fichier: definit les routes API et relie les endpoints aux controles backend.
import express from "express";
import Task from "../models/Task.js";
import { chatWithAI } from "../controllers/aiController.js";
import { optionalAuth, protect } from "../middleware/auth.js";
import { tenantIsolation } from "../middleware/tenant.js";
import { assertDocumentPersisted, ensureMongoConnected } from "../services/persistenceVerifier.js";

const ASSIGNABLE_AI_TASK_ROLES = new Set(["employee", "stagiaire", "comptable"]);

const router = express.Router();

router.post("/chat", optionalAuth, chatWithAI);

router.post("/create-task-from-ai", protect, tenantIsolation, async (req, res, next) => {
  try {
    ensureMongoConnected("create task from AI");
    const { title } = req.body;
    const user = req.user;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const taskPayload = {
      title,
      assignedTo: user._id,
      assignedBy: user._id,
      createdBy: user._id,
      tenantId: req.tenantId || user.tenantId,
      status: "todo",
    };

    if (ASSIGNABLE_AI_TASK_ROLES.has(user.role)) {
      taskPayload.assignedRole = user.role;
      taskPayload.role = user.role;
    }

    const task = await Task.create(taskPayload);
    await assertDocumentPersisted(Task, task._id, "AI created task", {
      userId: user._id,
    });

    return res.json(task);
  } catch (error) {
    console.error("CREATE TASK ERROR:", error.message);
    return next(error);
  }
});

export default router;
