import { predict, recommend } from "./mlService.js";
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

      if (user) {
        await notifService.create(user._id, user.tenantId, {
          type: "warning",
          title: "AI Alert",
          message: "High risk detected. Immediate action required.",
          source: "ai",
          actionUrl: "/tasks",
        });
      }
    }

    // 🧠 GENERATE INTELLIGENT RESPONSE
    const aiResponse = generateAIResponse(message, context, rec.recommendations);

    return aiResponse;

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Je suis en train d'analyser votre demande. Voici ce que je recommande : optimisez vos processus en fonction de vos données récentes.";
  }
}

// 🤖 Generate AI response based on message and context
function generateAIResponse(message, context, recommendations) {
  const lowerMessage = message.toLowerCase();

  // 📊 Sales-related questions
  if (lowerMessage.includes("vente") || lowerMessage.includes("sales")) {
    return `Concernant vos ventes, voici mes recommandations : ${recommendations?.join(" • ") || "Analysez les tendances de vente, identifiez les produits à forte demande et optimisez votre stratégie commerciale."}`;
  }

  // 👥 HR-related questions
  if (lowerMessage.includes("rh") || lowerMessage.includes("équipe") || lowerMessage.includes("employe") || lowerMessage.includes("team")) {
    return `Pour la gestion de votre équipe : ${recommendations?.join(" • ") || "Évaluez la performance des employés, améliorez la communication interne et développez les compétences critiques."}`;
  }

  // 💰 Finance-related questions
  if (lowerMessage.includes("finance") || lowerMessage.includes("dépense") || lowerMessage.includes("budget") || lowerMessage.includes("tresorerie")) {
    return `Analyse financière : ${recommendations?.join(" • ") || "Réduisez les coûts inutiles, optimisez l'allocation des ressources et améliorez le ROI."}`;
  }

  // 📈 Analysis-related questions
  if (lowerMessage.includes("analys") || lowerMessage.includes("data") || lowerMessage.includes("insight")) {
    return `Basé sur l'analyse des données : ${recommendations?.join(" • ") || "Explorez les métriques clés, identifiez les patterns et prenez des décisions basées sur les données."}`;
  }

  // 🎯 CRM-related questions
  if (lowerMessage.includes("crm") || lowerMessage.includes("client") || lowerMessage.includes("customer")) {
    return `Gestion des clients : ${recommendations?.join(" • ") || "Améliorez la relation client, segmentez votre audience et personnalisez vos interactions."}`;
  }

  // Default response
  return `Votre demande : "${message}". ${recommendations?.join(" • ") || "Je recommande de consulter les tableaux de bord pour obtenir une analyse complète. Comment puis-je vous aider davantage ?"}`;
}