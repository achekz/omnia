// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import { normalizeRole } from "../utils/roleNormalization.js";
import { logExternalError, logExternalRequest, logExternalResponse, redactUrl } from "../utils/networkDiagnostics.js";

const GEMINI_PREFERRED_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.0-pro",
];

const GEMINI_UNAVAILABLE_MESSAGE =
  "L'IA est temporairement indisponible. Réessayez dans quelques secondes.";
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const TEXT_ATTACHMENT_LIMIT = 12000;

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

function getAttachmentByteSize(base64Data = "") {
  return Math.ceil((base64Data.length * 3) / 4);
}

function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const name = String(attachment.name || "document").slice(0, 160);
  const mimeType = String(attachment.type || attachment.mimeType || "").toLowerCase();
  const textContent =
    typeof attachment.textContent === "string"
      ? attachment.textContent.slice(0, TEXT_ATTACHMENT_LIMIT)
      : "";
  const data =
    typeof attachment.data === "string"
      ? attachment.data.replace(/^data:[^;]+;base64,/, "").trim()
      : "";

  if (!textContent && !data) {
    return null;
  }

  if (data && getAttachmentByteSize(data) > MAX_ATTACHMENT_BYTES) {
    const error = new Error(`Attachment "${name}" is too large.`);
    error.code = "XAI_ATTACHMENT_TOO_LARGE";
    throw error;
  }

  return {
    name,
    mimeType,
    textContent,
    data,
  };
}

function canSendInlineData(attachment) {
  return (
    attachment.data &&
    (attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf")
  );
}

function buildGeminiParts(prompt, systemInstruction, attachments = []) {
  const normalizedAttachments = attachments
    .slice(0, MAX_ATTACHMENTS)
    .map(normalizeAttachment)
    .filter(Boolean);

  const parts = [
    {
      text: `${systemInstruction}\n\nUser question: ${prompt.trim()}`,
    },
  ];

  if (normalizedAttachments.length === 0) {
    return parts;
  }

  parts.push({
    text:
      "The user attached document(s). Read their content carefully and answer the user's question using the attachments when relevant. If the attachment is an image, inspect it visually.",
  });

  for (const attachment of normalizedAttachments) {
    parts.push({
      text: `Attachment: ${attachment.name}\nMIME type: ${attachment.mimeType || "unknown"}`,
    });

    if (attachment.textContent) {
      parts.push({
        text: `Extracted text content from ${attachment.name}:\n${attachment.textContent}`,
      });
      continue;
    }

    if (canSendInlineData(attachment)) {
      parts.push({
        inline_data: {
          mime_type: attachment.mimeType,
          data: attachment.data,
        },
      });
      continue;
    }

    parts.push({
      text: `The file "${attachment.name}" could not be read directly because its format is not supported by the current attachment reader.`,
    });
  }

  return parts;
}

function buildRagContextText(ragContext) {
  if (!ragContext) {
    return "";
  }

  const safeContext = JSON.stringify(ragContext, null, 2);
  return `
Application context retrieved from MongoDB:
${safeContext}

Rules for using this context:
- Answer using the application context first.
- Do not invent tasks, notifications, attendance records, users, rules, or metrics that are not present in the context.
- If the context does not contain the requested data, say that clearly and explain what data is missing.
- When listing tasks, include their title, status, priority, and due date when available.
- For prioritization, use overdue status, due dates, priority, priorityScore, progress, and existing recommendations.
- Keep the response concise and practical.
`;
}

function buildContextualSystemInstruction(baseInstruction, ragContext) {
  const contextInstruction = ragContext
    ? " You are also a RAG assistant for the OmniAI application. You receive live MongoDB context for the current user and must ground operational answers in that context."
    : "";

  return `${baseInstruction}${contextInstruction}`;
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    logExternalRequest("GEMINI", { method: "GET", url });
    const response = await fetch(url);
    const rawText = await response.text();
    const payload = parseJsonSafe(rawText);
    logExternalResponse("GEMINI", {
      method: "GET",
      url,
      status: response.status,
      statusText: response.statusText,
      data: payload || rawText,
    });

    if (!response.ok) {
      return [];
    }

    const models = payload?.models || [];
    return sortGeminiModels(
      models.filter(isTextGenerationModel).map((model) => normalizeModelName(model.name))
    );
  } catch (error) {
    logExternalError("GEMINI", error, { method: "GET", url });
    return [];
  }
}

async function getCandidateModels(apiKey) {
  const availableModels = await listAvailableGeminiModels(apiKey);
  return [...new Set([...GEMINI_PREFERRED_MODELS, ...availableModels])];
}

export async function generateResponse(prompt, role = "employee", attachments = [], ragContext = null) {
  if (!prompt || !prompt.trim()) {
    const error = new Error("Prompt is required.");
    error.code = "XAI_PROMPT_REQUIRED";
    throw error;
  }

  const apiKey = getGeminiApiKey();
  const systemInstruction = buildContextualSystemInstruction(getRoleInstruction(role), ragContext);
  const contextualPrompt = ragContext
    ? `${buildRagContextText(ragContext)}\n\nUser question: ${prompt}`
    : prompt;
  const parts = buildGeminiParts(contextualPrompt, systemInstruction, attachments);
  const candidateModels = await getCandidateModels(apiKey);

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [{ role: "user", parts }],
    };
    let response;

    try {
      logExternalRequest("GEMINI", {
        method: "POST",
        url: redactUrl(url),
        data: { model, partsCount: parts.length },
      });
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      logExternalError("GEMINI", error, { method: "POST", url, metadata: { model } });
      throw error;
    }

    const rawText = await response.text();
    const payload = parseJsonSafe(rawText);
    logExternalResponse("GEMINI", {
      method: "POST",
      url,
      status: response.status,
      statusText: response.statusText,
      data: payload || rawText,
      metadata: { model },
    });

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

    const reply = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

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
