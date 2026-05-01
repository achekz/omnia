import axios from "axios";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:5000",
  timeout: 8000,
});

// -------- RISK --------
export const predict = async (features) => {
  try {
    const { data } = await mlClient.post("/predict-risk", {
      features: [
        features.tasks_completed_last_7d || 0,
        features.avg_daily_active_minutes || 0,
        features.deadlines_missed_last_30d || 0,
        features.login_frequency || 0,
        features.overdue_count || 0,
      ],
    });

    return data;
  } catch (error) {
    console.error("ML ERROR:", error.message);

    const overdue = Number(features.overdue_count || 0);
    const completed = Number(features.tasks_completed_last_7d || 0);

    const riskScore = Math.max(0, Math.min(1, 0.25 + overdue * 0.18 - completed * 0.03));

    return {
      risk_score: riskScore,
      risk_level: riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low",
      fallback: true,
    };
  }
};

// -------- RECOMMEND --------
export const recommend = async (features) => {
  try {
    const { data } = await mlClient.post("/recommend", {
      features: Object.values(features),
    });

    return data;
  } catch {
    return { recommendations: [], fallback: true };
  }
};

// -------- ANOMALY --------
export const detectAnomaly = async (values) => {
  try {
    const { data } = await mlClient.post("/detect-anomaly", {
      features: values,
    });

    return data;
  } catch {
    return {
      is_anomaly: false,
      anomaly_score: 0,
      fallback: true,
    };
  }
};