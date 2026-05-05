import axios from "axios";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:5000",
  timeout: 8000,
});

function mlUnavailable(error) {
  const unavailable = new Error(`ML service unavailable: ${error.message}`);
  unavailable.code = "ML_SERVICE_UNAVAILABLE";
  unavailable.statusCode = 503;
  return unavailable;
}

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
    throw mlUnavailable(error);
  }
};

// -------- RECOMMEND --------
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

export const predictDelay = async (features) => {
  try {
    const { data } = await mlClient.post("/ml/predict-delay", features);
    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};

export const detectPresenceAnomaly = async (features) => {
  try {
    const { data } = await mlClient.post("/ml/anomaly", features);
    return data;
  } catch (error) {
    throw mlUnavailable(error);
  }
};
