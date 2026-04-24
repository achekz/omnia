const DEFAULT_MODEL = "grok-4";
const XAI_BASE_URL = "https://api.x.ai/v1/chat/completions";

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

export async function generateResponse(prompt, role = "employee") {
  if (!prompt || !prompt.trim()) {
    const error = new Error("Prompt is required.");
    error.code = "XAI_PROMPT_REQUIRED";
    throw error;
  }

  const apiKey = getXaiApiKey();

  try {
    const response = await fetch(XAI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || DEFAULT_MODEL,
        messages: buildMessages(prompt, role),
        stream: false,
        temperature: 0.7,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        payload?.error?.message ||
        payload?.message ||
        `xAI request failed with status ${response.status}`,
      );
      error.code = payload?.error?.code || `XAI_HTTP_${response.status}`;
      error.status = response.status;
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
    console.error("[GROK] Failed to generate response:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    throw error;
  }
}
