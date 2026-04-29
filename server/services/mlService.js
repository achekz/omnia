import axios from "axios";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://localhost:5001",
  timeout: 8000,
});

export const predict = async (features) => {
  try {
    const payload = {
      features,
      activity_logs: features.activity_logs || [],
      tasks: features.tasks || [],
    };
    const { data } = await mlClient.post("/predict", payload);
    return data.prediction || data;
  } catch {
    const overdue = Number(features.overdue_count || features.deadlines_missed_last_30d || 0);
    const completed = Number(features.tasks_completed_last_7d || 0);
    const riskScore = Math.max(0, Math.min(1, 0.25 + overdue * 0.18 - completed * 0.03));
    return {
      risk_score: riskScore,
      risk_level: riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low",
      confidence: 0.62,
      fallback: true,
    };
  }
};

export const recommend = async (context) => {
  try {
    const { data } = await mlClient.post("/recommend", { context });
    return data;
  } catch {
    return { recommendations: [], fallback: true };
  }
};

export const detectAnomaly = async (values) => {
  try {
    const { data } = await mlClient.post("/anomaly", { values });
    return data;
  } catch {
    try {
      const { data } = await mlClient.post("/anomalies", {
        historical_features: values,
      });
      return {
        is_anomaly: Boolean(data.has_critical || data.total_anomalies > 0),
        anomaly_score: data.total_anomalies || 0,
        details: data,
      };
    } catch {
      const amounts = values.map(Number).filter(Number.isFinite);
      const avg = amounts.length ? amounts.reduce((sum, value) => sum + value, 0) / amounts.length : 0;
      const latest = amounts[amounts.length - 1] || 0;
      const isAnomaly = avg > 0 && latest > avg * 2.5;
      return {
        is_anomaly: isAnomaly,
        anomaly_score: isAnomaly ? Math.min(1, latest / (avg * 4)) : 0,
        fallback: true,
      };
    }
  }
};
