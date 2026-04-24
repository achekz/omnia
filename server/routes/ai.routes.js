import express from "express";
import Task from "../models/Task.js";
import { chatWithAI } from "../controllers/aiController.js";
import { optionalAuth, protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/chat", optionalAuth, chatWithAI);

router.post("/create-task-from-ai", protect, async (req, res) => {
  try {
    const { title } = req.body;
    const user = req.user;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const task = await Task.create({
      title,
      assignedTo: user._id,
      status: "todo",
    });

    return res.json(task);
  } catch (error) {
    console.error("CREATE TASK ERROR:", error.message);
    return res.status(500).json({ error: "Task creation failed" });
  }
});

export default router;
