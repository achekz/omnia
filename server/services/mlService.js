import axios from "axios";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://localhost:5001",
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// 🔮 PREDICTION
export const predict = async (features) => {
  try {
    const { data } = await mlClient.post("/predict", { features });

    return {
      risk_score: data.risk_score ?? 50,
      risk_level: data.risk_level ?? "medium",
      confidence: data.confidence ?? 0.5,
      fallback: false,
    };

  } catch (err) {
    console.warn("[MLService] predict fallback:", err.message);

    return {
      risk_score: 50,
      risk_level: "medium",
      confidence: 0.5,
      fallback: true,
    };
  }
};

// 💡 RECOMMENDATION
export const recommend = async (context) => {
  try {
    const { data } = await mlClient.post("/recommend", { context });

    return {
      recommendations: data.recommendations || [],
      fallback: false,
    };

  } catch (err) {
    console.warn("[MLService] recommend fallback:", err.message);

    return {
      recommendations: [
        "Focus on high-priority tasks",
        "Take regular breaks",
        "Review your goals",
      ],
      fallback: true,
    };
  }
};

// 🚨 ANOMALY DETECTION
export const detectAnomaly = async (values) => {
  try {
    const { data } = await mlClient.post("/anomaly", { values });

    return {
      is_anomaly: data.is_anomaly ?? false,
      anomaly_score: data.anomaly_score ?? 0,
      fallback: false,
    };

  } catch (err) {
    console.warn("[MLService] anomaly fallback:", err.message);

    return {
      is_anomaly: false,
      anomaly_score: 0,
      fallback: true,
    };
  }
};