import axios from 'axios';

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

export const predict = async (features) => {
  try {
    const { data } = await mlClient.post('/predict', { features });
    return data;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MLService] predict failed – using fallback:', err.message);
    }
    // Graceful degradation
    return {
      risk_level: 'medium',
      risk_score: 50,
      confidence: 0.5,
      fallback: true,
    };
  }
};

export const recommend = async (context) => {
  try {
    const { data } = await mlClient.post('/recommend', { context });
    return data;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MLService] recommend failed – using fallback:', err.message);
    }
    return {
      recommendations: [
        'Focus on high-priority tasks first',
        'Take a 5-minute break every 45 minutes',
        'Review your weekly goals',
      ],
      fallback: true,
    };
  }
};

export const detectAnomaly = async (values) => {
  try {
    const { data } = await mlClient.post('/anomaly', { values });
    return data;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MLService] anomaly detection failed – using fallback:', err.message);
    }
    return { is_anomaly: false, anomaly_score: 0, fallback: true };
  }
};
