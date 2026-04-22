import axios from "axios";

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://localhost:5001",
  timeout: 8000,
});

export const predict = async (features) => {
  try {
    const { data } = await mlClient.post("/predict", { features });
    return data;
  } catch {
    return { risk_score: 50, fallback: true };
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
    return { is_anomaly: false, fallback: true };
  }
};