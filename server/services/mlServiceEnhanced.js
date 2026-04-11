import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';

/**
 * ML SERVICE ENHANCED CLIENT
 * Improved integration with retry logic, timeout, and error handling
 */

class MLServiceClient {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.timeout = parseInt(process.env.ML_SERVICE_TIMEOUT || '30000');
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Create axios instance with retry logic
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ML-Client/1.0',
      },
    });

    // Add response interceptor
    this.client.interceptors.response.use(
      response => response,
      error => this._handleError(error)
    );
  }

  /**
   * HEALTH CHECK
   * Verify ML service is running
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        healthy: response.status === 200,
        data: response.data,
      };
    } catch (error) {
      console.warn('ML Service health check failed:', error.message);
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * PREDICT RISK
   * Get prediction for single user
   */
  async predict(userId, activityLogs, tasks) {
    try {
      const response = await this._requestWithRetry('/predict', 'POST', {
        user_id: userId,
        activity_logs: activityLogs,
        tasks: tasks,
      });

      return {
        success: true,
        prediction: response.data.prediction,
      };
    } catch (error) {
      console.error('Prediction error:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: this._getFallbackPrediction(),
      };
    }
  }

  /**
   * BATCH PREDICT
   * Get predictions for multiple users
   */
  async predictBatch(users) {
    try {
      const response = await this._requestWithRetry('/predict/batch', 'POST', {
        users: users,
      });

      return {
        success: true,
        predictions: response.data.predictions,
        batchSize: response.data.batch_size,
      };
    } catch (error) {
      console.error('Batch prediction error:', error.message);
      return {
        success: false,
        error: error.message,
        predictions: users.map(u => ({
          user_id: u.user_id,
          prediction: this._getFallbackPrediction(),
        })),
      };
    }
  }

  /**
   * GET RECOMMENDATIONS
   * Get personalized recommendations for user
   */
  async recommend(userId, activityLogs, tasks) {
    try {
      const response = await this._requestWithRetry('/recommend', 'POST', {
        user_id: userId,
        activity_logs: activityLogs,
        tasks: tasks,
      });

      return {
        success: true,
        recommendations: response.data.recommendations,
        tips: response.data.tips,
        nextActions: response.data.next_actions,
      };
    } catch (error) {
      console.error('Recommendation error:', error.message);
      return {
        success: false,
        error: error.message,
        recommendations: [],
        tips: [],
        nextActions: [],
      };
    }
  }

  /**
   * DETECT ANOMALIES
   * Detect unusual behavior patterns
   */
  async detectAnomalies(userId, activityLogs, tasks, historicalFeatures = null) {
    try {
      const response = await this._requestWithRetry('/anomalies', 'POST', {
        user_id: userId,
        activity_logs: activityLogs,
        tasks: tasks,
        historical_features: historicalFeatures,
      });

      return {
        success: true,
        anomalies: response.data.anomalies,
        anomalyLevel: response.data.anomaly_level,
        hasCritical: response.data.has_critical,
        alertActions: response.data.alert_actions,
      };
    } catch (error) {
      console.error('Anomaly detection error:', error.message);
      return {
        success: false,
        error: error.message,
        anomalies: [],
        anomalyLevel: 'unknown',
        hasCritical: false,
      };
    }
  }

  /**
   * COMPLETE ANALYSIS
   * Get prediction + recommendations + anomalies in one call
   */
  async analyzeComplete(userId, activityLogs, tasks, historicalFeatures = null) {
    try {
      const response = await this._requestWithRetry('/analyze', 'POST', {
        user_id: userId,
        activity_logs: activityLogs,
        tasks: tasks,
        historical_features: historicalFeatures,
      });

      return {
        success: true,
        prediction: response.data.prediction,
        recommendations: response.data.recommendations,
        anomalies: response.data.anomalies,
        summary: response.data.summary,
      };
    } catch (error) {
      console.error('Complete analysis error:', error.message);
      return {
        success: false,
        error: error.message,
        prediction: this._getFallbackPrediction(),
        recommendations: { items: [], tips: [] },
        anomalies: { detected: [], level: 'unknown' },
      };
    }
  }

  /**
   * EXTRACT FEATURES
   * Get engineered features from raw data
   */
  async extractFeatures(activityLogs, tasks, financialRecords = []) {
    try {
      const response = await this._requestWithRetry('/features/extract', 'POST', {
        activity_logs: activityLogs,
        tasks: tasks,
        financial_records: financialRecords,
      });

      return {
        success: true,
        features: response.data.features,
      };
    } catch (error) {
      console.error('Feature extraction error:', error.message);
      return {
        success: false,
        error: error.message,
        features: {},
      };
    }
  }

  /**
   * GET MODEL INFO
   * Get information about ML models
   */
  async getModelsInfo() {
    try {
      const response = await this.client.get('/models/info');
      return {
        success: true,
        models: response.data.models,
      };
    } catch (error) {
      console.error('Get models info error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * REQUEST WITH RETRY
   * Internal method for requests with automatic retry
   */
  async _requestWithRetry(endpoint, method, data, retryCount = 0) {
    try {
      const config = {
        method: method.toLowerCase(),
        url: endpoint,
      };

      if (method.toUpperCase() === 'POST' && data) {
        config.data = data;
      }

      const response = await this.client(config);
      return response;
    } catch (error) {
      // Check if should retry
      if (
        retryCount < this.maxRetries &&
        this._isRetryableError(error)
      ) {
        console.warn(
          `Retry ${retryCount + 1}/${this.maxRetries} for ${endpoint}`
        );

        // Wait before retry with exponential backoff
        await this._delay(this.retryDelay * Math.pow(2, retryCount));

        return this._requestWithRetry(endpoint, method, data, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * HANDLE ERROR
   * Convert axios errors to custom format
   */
  _handleError(error) {
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject(
        new Error('ML Service unavailable - connection refused')
      );
    }

    if (error.code === 'ENOTFOUND') {
      return Promise.reject(
        new Error('ML Service unavailable - host not found')
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return Promise.reject(
        new Error('ML Service unavailable - request timeout')
      );
    }

    if (error.response?.status === 503) {
      return Promise.reject(
        new Error('ML Service unavailable - service error')
      );
    }

    return Promise.reject(error);
  }

  /**
   * IS RETRYABLE ERROR
   * Determine if error should trigger retry
   */
  _isRetryableError(error) {
    if (!error) return false;

    // Retry on network errors
    const retryableCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ECONNRESET',
    ];

    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // Retry on 5xx errors
    if (error.response?.status >= 500) {
      return true;
    }

    // Don't retry on 4xx errors
    return false;
  }

  /**
   * FALLBACK PREDICTION
   * Return safe prediction when service unavailable
   */
  _getFallbackPrediction() {
    return {
      risk_level: 'medium',
      risk_score: 0.5,
      confidence: 0.3,
      explanation: 'ML Service unavailable - using fallback prediction',
      is_fallback: true,
    };
  }

  /**
   * DELAY HELPER
   * Sleep for specified milliseconds
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * SET ML SERVICE URL
   * Update service URL at runtime
   */
  setServiceURL(url) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
    console.log(`ML Service URL updated to: ${url}`);
  }

  /**
   * SET TIMEOUT
   * Update request timeout
   */
  setTimeout(ms) {
    this.timeout = ms;
    this.client.defaults.timeout = ms;
  }
}

// Create and export singleton instance
const mlClient = new MLServiceClient();

export default mlClient;
