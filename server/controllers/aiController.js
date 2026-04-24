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
      status: error.status,
      role: req.user?.role,
    });

    if (error.code === "XAI_CONFIG_MISSING") {
      throw new ApiError(500, "XAI_API_KEY is missing in server/.env");
    }

    if (error.code === "XAI_EMPTY_RESPONSE") {
      throw new ApiError(502, "Grok returned an empty response");
    }

    if (error.status === 401 || error.status === 403) {
      throw new ApiError(502, "Invalid xAI API key or model access denied");
    }

    if (error.status === 429) {
      throw new ApiError(502, "xAI rate limit reached. Try again in a moment");
    }

    throw new ApiError(502, error.message || "Failed to generate AI response");
  }
});
