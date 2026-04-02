import axios from "axios";
import { predict, recommend } from "./mlService.js";
import { buildPrompt } from "./promptBuilder.js";
import * as notifService from "./notifService.js";

export async function askAI({ user, message, context }) {
  try {
    // 🔮 ML prediction
    const prediction = await predict(context);
    
    context.futureScore = prediction.risk_score;

    context.risk_score = prediction.risk_score;
    context.risk_level = prediction.risk_level;

    // 💡 ML recommendations
    const rec = await recommend(context);
    context.recommendations = rec.recommendations;

    // 🚨 HIGH RISK ALERT
    if (prediction.risk_score > 70) {
      context.alert = "⚠️ High risk detected";

      await notifService.create(user._id, user.tenantId, {
        type: "warning",
        title: "AI Alert",
        message: "High risk detected. Immediate action required.",
        source: "ai",
        actionUrl: "/tasks",
      });
    }

    // 🧠 PROMPT
    const prompt = buildPrompt(user, message, context);

    // 🤖 AI CALL
    const response = await axios.post("http://localhost:5000/ai", {
      prompt,
    });

    return response.data.response;

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Erreur AI";
  }
}