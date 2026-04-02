import axios from "axios";
import { predict } from "./mlService.js";
import { buildPrompt } from "./promptBuilder.js";

export async function askAI({ user, message, context }) {
  try {
    // 🔥 ML prediction
    const prediction = await predict(context);

    // injecter alert si risque élevé
    if (prediction.risk_score > 70) {
      context.alert = "⚠️ High risk detected";
      context.risk_score = prediction.risk_score;
    }

    // construire prompt
    const prompt = buildPrompt(user, message, context);

    // appel AI
    const response = await axios.post("http://localhost:5000/ai", {
      prompt,
    });

    return response.data.response;

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Erreur AI";
  }
}