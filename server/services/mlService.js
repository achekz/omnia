// Role du fichier: regroupe la logique metier reutilisable et les integrations externes.
import axios from "axios";
import { savePrediction } from "./persistenceService.js";
import { attachAxiosDiagnostics } from "../utils/networkDiagnostics.js";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:5001",
  timeout: 8000,
});
attachAxiosDiagnostics(mlClient, "ML_SERVICE");

export const persistPrediction = async (payload) => savePrediction(payload);

// Role: Decrit la logique mlUnavailable.
function mlUnavailable(error) {
  const unavailable = new Error(`ML service unavailable: ${error.message}`);
  unavailable.code = "ML_SERVICE_UNAVAILABLE";
  unavailable.statusCode = 503;
  return unavailable;
}

// -------- RISK --------
// Role: Lance un traitement metier ou IA.
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
    const completed = Number(features.tasks_completed_last_7d || 0);
    const activeMinutes = Number(features.avg_daily_active_minutes || 0);
    const missed = Number(features.deadlines_missed_last_30d || 0);
    const loginFrequency = Number(features.login_frequency || 0);
    const overdue = Number(features.overdue_count || 0);
    const completionPressure = 1 - Math.min(1, completed / Math.max(completed + overdue, 1));
    const activityPressure = 1 - Math.min(1, activeMinutes / 240);
    const deadlinePressure = Math.min(1, (missed + overdue) / 8);
    const engagementPressure = 1 - Math.min(1, loginFrequency / 5);
    const riskScore = Math.max(
      0,
      Math.min(
        1,
        completionPressure * 0.25 +
          activityPressure * 0.2 +
          deadlinePressure * 0.35 +
          engagementPressure * 0.2
      )
    );

    return {
      risk: riskScore,
      risk_score: riskScore,
      risk_level: riskScore >= 0.7 ? "high" : riskScore >= 0.4 ? "medium" : "low",
      confidence: 0.74,
      source: "local-fallback",
      warning: mlUnavailable(error).message,
    };
  }
};

// -------- RECOMMEND --------
// Role: Lance un traitement metier ou IA.
export const recommend = async (features) => {
  try {
    const { data } = await mlClient.post("/recommend", {
      features: Object.values(features),
    });

    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};

// -------- ANOMALY --------
// Role: Lance un traitement metier ou IA.
export const detectAnomaly = async (values) => {
  try {
    const { data } = await mlClient.post("/detect-anomaly", {
      features: values,
    });

    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};

// Role: Lance un traitement metier ou IA.
export const predictDelay = async (features) => {
  try {
    const { data } = await mlClient.post("/ml/predict-delay", features);
    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};

// Role: Lance un traitement metier ou IA.
export const detectPresenceAnomaly = async (features) => {
  try {
    const { data } = await mlClient.post("/ml/anomaly", features);
    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};
