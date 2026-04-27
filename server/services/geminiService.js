const DEFAULT_MODEL = "grok-4.20-reasoning";
const XAI_BASE_URL = "https://api.x.ai/v1/chat/completions";
const FALLBACK_MODELS = ["grok-4.20-reasoning", "grok-4"];

function getXaiApiKey() {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    const error = new Error("XAI_API_KEY is not configured.");
    error.code = "XAI_CONFIG_MISSING";
    throw error;
  }

  return apiKey;
}

function getRoleInstruction(role) {
  const normalizedRole = String(role || "").toLowerCase();

  switch (normalizedRole) {
    case "rh":
    case "hr":
    case "employee":
      return "User role is employee. Answer like a productivity assistant. Focus on execution, organization, and efficiency.";
    case "student":
      return "User role is student. Answer like a study assistant. Be clear, structured, and educational.";
    case "accountant":
    case "comptable":
      return "User role is comptable. Answer like a finance assistant. Be precise, practical, and business-focused.";
    case "intern":
    case "stagiaire":
      return "User role is stagiaire. Answer like a productivity assistant for guided execution, learning, and follow-through.";
    default:
      return "Answer like a professional AI assistant. Be concise, helpful, and actionable.";
  }
}

function buildMessages(prompt, role) {
  return [
    {
      role: "system",
      content: [
        "You are Omni AI, a production-ready assistant inside a business platform.",
        getRoleInstruction(role),
        "If the user asks for steps or recommendations, prefer concrete actions.",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: prompt.trim(),
    },
  ];
}

function extractReply(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function getModelCandidates() {
  const configuredModel = process.env.XAI_MODEL?.trim();
  const models = [configuredModel, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean);
  return [...new Set(models)];
}

function buildApiError(status, payload, rawText) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    rawText ||
    `xAI request failed with status ${status}`;

  const error = new Error(message);
  error.code = payload?.error?.code || `XAI_HTTP_${status}`;
  error.status = status;
  return error;
}

export async function generateResponse(prompt, role = "employee") {
  if (!prompt || !prompt.trim()) {
    const error = new Error("Prompt is required.");
    error.code = "XAI_PROMPT_REQUIRED";
    throw error;
  }

  const apiKey = getXaiApiKey();
  const models = getModelCandidates();
  let lastError;

  for (const model of models) {
    try {
      const response = await fetch(XAI_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: buildMessages(prompt, role),
          stream: false,
        }),
      });

      const rawText = await response.text();
      const payload = rawText ? JSON.parse(rawText) : null;

      if (!response.ok) {
        const error = buildApiError(response.status, payload, rawText);

        console.error("[GROK] Request failed for model:", {
          model,
          message: error.message,
          code: error.code,
          status: error.status,
        });

        lastError = error;

        if (response.status === 400 || response.status === 404) {
          continue;
        }

        throw error;
      }

      const reply = extractReply(payload);

      if (!reply) {
        const error = new Error("Grok returned an empty response.");
        error.code = "XAI_EMPTY_RESPONSE";
        throw error;
      }

      return reply;
    } catch (error) {
      if (error instanceof SyntaxError) {
        lastError = new Error("xAI returned an invalid JSON response.");
        lastError.code = "XAI_INVALID_JSON";
      } else {
        lastError = error;
      }

      if (lastError.status === 400 || lastError.status === 404) {
        continue;
      }

      console.error("[GROK] Failed to generate response:", {
        model,
        message: lastError.message,
        code: lastError.code,
        status: lastError.status,
      });
      throw lastError;
    }
  }

  console.error("[GROK] All model attempts failed:", {
    message: lastError?.message,
    code: lastError?.code,
    status: lastError?.status,
    triedModels: models,
  });
  throw lastError || new Error("Failed to generate AI response");
}
