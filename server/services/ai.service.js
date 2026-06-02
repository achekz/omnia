// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import axios from "axios";
import { predict, recommend } from "./mlService.js";
import * as notifService from "./notifService.js";
import { logExternalError, logExternalRequest, logExternalResponse } from "../utils/networkDiagnostics.js";

/**
 * Main AI function
 */
// Role: Decrit la logique askAI.
export async function askAI({ user, message, context }) {
  try {
    console.log("🤖 AI Processing:", message);

    // 🔮 ML (optionnel)
    let mlContext = { risk_score: 0, recommendations: [] };

    try {
      const prediction = await predict(context);
      const rec = await recommend(context);

      mlContext = {
        risk_score: prediction.risk_score,
        recommendations: rec.recommendations || [],
      };

      if (user && prediction.risk_score > 70) {
        await notifService.create(user._id, user.tenantId, {
          type: "warning",
          title: "🤖 AI Alert",
          message: "High risk detected",
          source: "ai",
        }).catch(() => {});
      }

    } catch {
      console.log("ℹ️ ML skipped");
    }

    // 🧠 Prompt simple
    const prompt = `
You are an intelligent assistant like ChatGPT.

User role: ${user?.role || "guest"}

Context:
${JSON.stringify(context)}

ML:
${JSON.stringify(mlContext)}

Question:
${message}

Answer clearly and naturally.
`;

    // ✅ CALL FLASK (CORRECT)
    const aiUrl = `${process.env.ML_SERVICE_URL || "http://localhost:5001"}/ai`;
    logExternalRequest("AI_SERVICE", {
      method: "POST",
      url: aiUrl,
      data: { promptLength: prompt.length },
      metadata: { timeout: 30000 },
    });
    const response = await axios.post(
      aiUrl,
      { prompt },
      { timeout: 30000 }
    );
    logExternalResponse("AI_SERVICE", {
      method: "POST",
      url: aiUrl,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });

    const aiResponse = response.data?.response;

    if (!aiResponse) {
      throw new Error("Empty AI response");
    }

    console.log("✅ AI OK");
    return aiResponse;

  } catch (err) {
    logExternalError("AI_SERVICE", err);
    console.error("❌ AI ERROR:", err.message);
    throw new Error("AI service unavailable");
  }
}
