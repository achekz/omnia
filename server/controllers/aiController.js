import { generateResponse } from "../services/geminiService.js";
import { ApiError } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatWithAI = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new ApiError(400, "Message is required");
  }

  if (message.length > 5000) {
    throw new ApiError(400, "Message is too long");
  }

  try {
    const reply = await generateResponse(message, req.user?.role);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("[AI] Chat request failed:", {
      message: error.message,
      code: error.code,
      role: req.user?.role,
    });
    throw new ApiError(502, "Failed to generate AI response");
  }
});
