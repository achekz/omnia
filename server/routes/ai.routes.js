import express from "express";
import ragService from "../services/ragService-mongodb.js";
import { protect } from "../middleware/auth.js";
import Task from "../models/Task.js";

const router = express.Router();

// 🤖 AI CHAT (RAG-POWERED)
router.post("/ask", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || message.trim().length === 0) {
      return res.json({
        success: false,
        response: 'Please provide a message',
      });
    }

    console.log('[AI] Ask message:', message);

    // Get response from RAG service
    const result = await ragService.generateResponseWithRAG(message, null);

    res.json({
      response: result.response,
      success: true,
      ...result,
    });

  } catch (err) {
    console.error("AI ROUTE ERROR:", err.message);
    res.json({
      success: false,
      response: 'Error: ' + err.message,
    });
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