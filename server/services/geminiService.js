import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-1.5-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.code = "GEMINI_CONFIG_MISSING";
    throw error;
  }

  return new GoogleGenerativeAI(apiKey);
}

function getRoleInstruction(role) {
  switch (role) {
    case "student":
      return "User role is student. Answer like a study assistant. Be clear, structured, and educational.";
    case "accountant":
      return "User role is accountant. Answer like a finance assistant. Be precise, practical, and business-focused.";
    case "employee":
      return "User role is employee. Answer like a productivity assistant. Focus on execution, organization, and efficiency.";
    default:
      return "Answer like a professional AI assistant. Be concise, helpful, and actionable.";
  }
}

function buildPrompt(prompt, role) {
  return [
    "You are Omni AI, a production-ready assistant inside a business platform.",
    getRoleInstruction(role),
    "If the user asks for steps or recommendations, prefer concrete actions.",
    `User message: ${prompt}`,
  ].join("\n\n");
}

export async function generateResponse(prompt, role = "employee") {
  if (!prompt || !prompt.trim()) {
    const error = new Error("Prompt is required.");
    error.code = "GEMINI_PROMPT_REQUIRED";
    throw error;
  }

  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    });

    const result = await model.generateContent(buildPrompt(prompt.trim(), role));
    const reply = result.response.text().trim();

    if (!reply) {
      const error = new Error("Gemini returned an empty response.");
      error.code = "GEMINI_EMPTY_RESPONSE";
      throw error;
    }

    return reply;
  } catch (error) {
    console.error("[GEMINI] Failed to generate response:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    throw error;
  }
}
