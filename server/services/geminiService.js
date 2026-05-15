// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import { normalizeRole } from "../utils/roleNormalization.js";

const GEMINI_PREFERRED_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.0-pro",
];

const GEMINI_UNAVAILABLE_MESSAGE =
  "L'IA est temporairement indisponible. Réessayez dans quelques secondes.";

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.code = "XAI_CONFIG_MISSING";
    throw error;
  }
  return apiKey;
}

function getRoleInstruction(role) {
  const normalizedRole = normalizeRole(role, "employee");
  const baseInstruction =
    "You are Omni AI, a helpful general-purpose assistant. Answer every normal user question directly, clearly, and naturally. Use the same language as the user when possible. Do not refuse simple questions. Keep answers concise unless the user asks for details.";

  switch (normalizedRole) {
    case "employee":
      return `${baseInstruction} The user role is employee. You may add practical work help when relevant, but still answer general questions normally.`;
    case "comptable":
      return `${baseInstruction} The user role is comptable. Be precise and practical for accounting or business questions, but still answer general questions normally.`;
    case "stagiaire":
      return `${baseInstruction} The user role is stagiaire. Explain simply and guide learning when useful, but still answer general questions normally.`;
    default:
      return baseInstruction;
  }
}

function parseJsonSafe(rawText) {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function normalizeModelName(modelName) {
  return modelName?.replace(/^models\//, "");
}

function isTextGenerationModel(model) {
  const modelName = normalizeModelName(model?.name);
  const supportedMethods = model?.supportedGenerationMethods || [];

  return (
    modelName?.startsWith("gemini-") &&
    supportedMethods.includes("generateContent") &&
    !modelName.includes("embedding") &&
    !modelName.includes("image") &&
    !modelName.includes("tts")
  );
}

function sortGeminiModels(models) {
  const priority = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
  ];

  return models.sort((firstModel, secondModel) => {
    const firstIndex = priority.findIndex((prefix) => firstModel.startsWith(prefix));
    const secondIndex = priority.findIndex((prefix) => secondModel.startsWith(prefix));
    const normalizedFirstIndex = firstIndex === -1 ? priority.length : firstIndex;
    const normalizedSecondIndex = secondIndex === -1 ? priority.length : secondIndex;

    if (normalizedFirstIndex !== normalizedSecondIndex) {
      return normalizedFirstIndex - normalizedSecondIndex;
    }

    return firstModel.localeCompare(secondModel);
  });
}

function isTemporaryModelMessage(reply) {
  const normalizedReply = reply.toLowerCase();
  return (
    normalizedReply.includes("currently experiencing high demand") ||
    normalizedReply.includes("please try again later") ||
    normalizedReply.includes("try again in a few minutes")
  );
}

async function listAvailableGeminiModels(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const rawText = await response.text();
    const payload = parseJsonSafe(rawText);

    if (!response.ok) {
      return [];
    }

    const models = payload?.models || [];
    return sortGeminiModels(
      models.filter(isTextGenerationModel).map((model) => normalizeModelName(model.name))
    );
  } catch {
    return [];
  }
}

async function getCandidateModels(apiKey) {
  const availableModels = await listAvailableGeminiModels(apiKey);
  return [...new Set([...GEMINI_PREFERRED_MODELS, ...availableModels])];
}

export async function generateResponse(prompt, role = "employee") {
  if (!prompt || !prompt.trim()) {
    const error = new Error("Prompt is required.");
    error.code = "XAI_PROMPT_REQUIRED";
    throw error;
  }

  const apiKey = getGeminiApiKey();
  const systemInstruction = getRoleInstruction(role);
  const fullPrompt = `${systemInstruction}\n\nUser: ${prompt.trim()}`;
  const candidateModels = await getCandidateModels(apiKey);

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    });

    const rawText = await response.text();
    const payload = parseJsonSafe(rawText);

    if (response.status === 404 || response.status === 429) {
      continue;
    }

    if (response.status === 400 && payload?.error?.message?.includes("not supported")) {
      continue;
    }

    if (!response.ok) {
      const message =
        payload?.error?.message || `Gemini request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.model = model;
      throw error;
    }

    const reply = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      const error = new Error("Gemini returned an empty response.");
      error.code = "XAI_EMPTY_RESPONSE";
      error.model = model;
      throw error;
    }

    if (isTemporaryModelMessage(reply)) {
      continue;
    }

    return reply;
  }

  return GEMINI_UNAVAILABLE_MESSAGE;
}
