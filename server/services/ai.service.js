import axios from "axios";
import { predict, recommend } from "./mlService.js";
import * as notifService from "./notifService.js";

/**
 * Main AI function
 */
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
    const response = await axios.post(
      "http://localhost:5001/ai",
      { prompt },
      { timeout: 30000 }
    );

    const aiResponse = response.data?.response;

    if (!aiResponse) {
      throw new Error("Empty AI response");
    }

    console.log("✅ AI OK");
    return aiResponse;

  } catch (err) {
    console.error("❌ AI ERROR:", err.message);
    throw new Error("AI service unavailable");
  }
}