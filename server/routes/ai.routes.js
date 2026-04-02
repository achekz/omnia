import express from "express";
import { askAI } from "../services/ai.service.js";
import { getContext } from "../services/contextBuilder.js";
import { protect } from "../middleware/auth.js";
import Task from "../models/Task.js";

const router = express.Router();

// 🤖 AI CHAT
router.post("/ask", async (req, res) => {
  try {
    const message = req.body.message;

    // Optional: get user context if authenticated
    let context = { user: null };
    if (req.user) {
      context = await getContext(req.user);
    }

    const response = await askAI({
      user: req.user || null,
      message,
      context,
    });

    res.json({ response });

  } catch (err) {
    console.error("AI ROUTE ERROR:", err.message);
    res.status(500).json({ error: "AI error" });
  }
});

// 🤖 CREATE TASK FROM AI
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

    res.json(task);

  } catch (err) {
    console.error("CREATE TASK ERROR:", err.message);
    res.status(500).json({ error: "Task creation failed" });
  }
});

export default router;