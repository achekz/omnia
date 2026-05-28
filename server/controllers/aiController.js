// Role du fichier: contient la logique backend des requetes et reponses API.
import { generateResponse } from "../services/geminiService.js";
import { retrieveRagContext } from "../services/ragRetrievalService.js";
import { ApiError } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Role: Decrit la logique chatWithAI.
export const chatWithAI = asyncHandler(async (req, res) => {
  const { message, attachments = [] } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new ApiError(400, "Message is required");
  }

  if (message.length > 20000) {
    throw new ApiError(400, "Message is too long");
  }

  if (!Array.isArray(attachments)) {
    throw new ApiError(400, "Attachments must be an array");
  }

  try {
    const ragContext = await retrieveRagContext({ user: req.user, question: message });
    const reply = await generateResponse(message, req.user?.role, attachments, ragContext);

    console.log("[AI:RAG] Chat response generated.", {
      userId: req.user?._id?.toString?.() || null,
      role: req.user?.role || "guest",
      tasks: ragContext.tasks?.length || 0,
      notifications: ragContext.recentNotifications?.length || 0,
      hasAuthenticatedUser: ragContext.hasAuthenticatedUser,
    });

    return res.status(200).json({
      reply,
      context: {
        enabled: Boolean(req.user),
        taskCount: ragContext.tasks?.length || 0,
        notificationCount: ragContext.recentNotifications?.length || 0,
        generatedAt: ragContext.generatedAt,
      },
    });
  } catch (error) {
    console.error("[AI] Chat request failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
      role: req.user?.role,
    });

    if (error.code === "XAI_CONFIG_MISSING") {
      throw new ApiError(500, "GEMINI_API_KEY is missing in server/.env");
    }

    if (error.code === "XAI_EMPTY_RESPONSE") {
      throw new ApiError(502, "Gemini returned an empty response");
    }

    if (error.code === "XAI_ATTACHMENT_TOO_LARGE") {
      throw new ApiError(400, error.message);
    }

    if (error.status === 401 || error.status === 403) {
      throw new ApiError(502, "Invalid Gemini API key or model access denied");
    }

    if (error.status === 429) {
      throw new ApiError(502, "Gemini rate limit reached. Try again in a moment");
    }

    if (String(error.message || "").includes("MongoDB is not connected")) {
      throw new ApiError(503, "MongoDB context is unavailable. The assistant cannot answer with application data right now.");
    }

    throw new ApiError(502, error.message || "Failed to generate AI response");
  }
});
