"""
Enhanced ML Service API
Flask application with complete ML models integrated
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging
from functools import wraps

# Import ML models
from models.predictor import predictor
from models.recommender import recommender
from models.anomaly_detector import anomaly_detector
from utils.feature_engineering import FeatureEngineering

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Error handling decorator
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': str(e), 'status': 'error'}), 400
        except Exception as e:
            logger.error(f"Error: {e}")
            return jsonify({'error': 'Internal server error', 'status': 'error'}), 500
    return decorated_function

# ==================== Health & Status ====================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Service',
        'timestamp': datetime.now().isoformat(),
        'models': {
            'predictor': predictor.get_model_info(),
            'recommender': recommender.get_model_info(),
            'anomaly_detector': anomaly_detector.get_model_info(),
        }
    }), 200

@app.route('/status', methods=['GET'])
def status():
    """Get service status"""
    return jsonify({
        'service': 'ML Service',
        'version': '1.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'models_available': {
            'predictor': predictor.trained,
            'recommender': True,
            'anomaly_detector': True,
        }
    }), 200

# ==================== Prediction Endpoints ====================

@app.route('/predict', methods=['POST'])
@handle_errors
def predict():
    """
    Predict risk level
    
    Body:
    {
        "activity_logs": [...],
        "tasks": [...],
        "user_id": "..."
    }
    
    Returns:
    {
        "risk_level": "low|medium|high",
        "risk_score": 0.0-1.0,
        "confidence": 0.0-1.0,
        "explanation": "..."
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract features
    activity_logs = data.get('activity_logs', [])
    tasks = data.get('tasks', [])

    features = FeatureEngineering.extract_activity_features(activity_logs)
    task_features = FeatureEngineering.extract_task_features(tasks)
    features.update(task_features)

    # Predict
    prediction = predictor.predict(features)

    return jsonify({
        'status': 'success',
        'prediction': prediction,
        'features_used': len(features),
    }), 200

@app.route('/predict/batch', methods=['POST'])
@handle_errors
def predict_batch():
    """Batch prediction for multiple users"""
    data = request.get_json()
    
    if not data or 'users' not in data:
        return jsonify({'error': 'No users provided'}), 400

    users = data.get('users', [])
    predictions = []

    for user_data in users:
        activity_logs = user_data.get('activity_logs', [])
        tasks = user_data.get('tasks', [])

        features = FeatureEngineering.extract_activity_features(activity_logs)
        task_features = FeatureEngineering.extract_task_features(tasks)
        features.update(task_features)

        prediction = predictor.predict(features)
        predictions.append({
            'user_id': user_data.get('user_id'),
            'prediction': prediction,
        })

    return jsonify({
        'status': 'success',
        'predictions': predictions,
        'batch_size': len(predictions),
    }), 200

# ==================== Recommendation Endpoints ====================

@app.route('/recommend', methods=['POST'])
@handle_errors
def recommend():
    """
    Get recommendations for user
    
    Body:
    {
        "activity_logs": [...],
        "tasks": [...]
    }
    
    Returns:
    {
        "recommendations": [
            {
                "category": "...",
                "title": "...",
                "description": "...",
                "priority": "high|medium|low"
            }
        ],
        "tips": [...],
        "next_actions": [...]
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract features
    activity_logs = data.get('activity_logs', [])
    tasks = data.get('tasks', [])

    features = FeatureEngineering.extract_activity_features(activity_logs)
    task_features = FeatureEngineering.extract_task_features(tasks)
    features.update(task_features)

    # Generate recommendations
    rec_result = recommender.recommend(features)
    tips = recommender.get_personalized_tips(features)
    next_actions = recommender.suggest_next_actions(features)

    return jsonify({
        'status': 'success',
        'recommendations': rec_result['recommendations'],
        'tips': tips,
        'next_actions': next_actions,
        'total_recommendations': rec_result['total_recommendations'],
    }), 200

# ==================== Anomaly Detection Endpoints ====================

@app.route('/anomalies', methods=['POST'])
@handle_errors
def detect_anomalies():
    """
    Detect anomalies in user behavior
    
    Body:
    {
        "activity_logs": [...],
        "tasks": [...],
        "historical_features": [...]  # Optional
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract features
    activity_logs = data.get('activity_logs', [])
    tasks = data.get('tasks', [])
    historical_features = data.get('historical_features', [])

    features = FeatureEngineering.extract_activity_features(activity_logs)
    task_features = FeatureEngineering.extract_task_features(tasks)
    features.update(task_features)

    # Detect anomalies
    anomalies_result = anomaly_detector.detect(features, historical_features)
    alert_actions = anomaly_detector.get_alert_actions(anomalies_result['anomalies'])

    return jsonify({
        'status': 'success',
        'anomalies': anomalies_result['anomalies'],
        'anomaly_level': anomalies_result['anomaly_level'],
        'has_critical': anomalies_result['has_critical_anomaly'],
        'alert_actions': alert_actions,
        'total_anomalies': anomalies_result['anomalies_detected'],
    }), 200

@app.route('/anomalies/batch', methods=['POST'])
@handle_errors
def detect_anomalies_batch():
    """Batch anomaly detection for multiple users"""
    data = request.get_json()
    
    if not data or 'users' not in data:
        return jsonify({'error': 'No users provided'}), 400

    users = data.get('users', [])
    all_results = []

    for user_data in users:
        activity_logs = user_data.get('activity_logs', [])
        tasks = user_data.get('tasks', [])

        features = FeatureEngineering.extract_activity_features(activity_logs)
        task_features = FeatureEngineering.extract_task_features(tasks)
        features.update(task_features)

        anomalies_result = anomaly_detector.detect(features)
        all_results.append({
            'user_id': user_data.get('user_id'),
            'anomalies': anomalies_result,
        })

    # Get severity distribution
    severity_dist = anomaly_detector.get_severity_distribution(
        [r['anomalies'] for r in all_results]
    )

    return jsonify({
        'status': 'success',
        'results': all_results,
        'batch_size': len(all_results),
        'severity_distribution': severity_dist,
    }), 200

# ==================== Complete Analysis Endpoint ====================

@app.route('/analyze', methods=['POST'])
@handle_errors
def complete_analysis():
    """
    Complete analysis: prediction + recommendations + anomalies
    
    Returns:
    {
        "prediction": {...},
        "recommendations": {...},
        "anomalies": {...},
        "summary": {...}
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract features
    activity_logs = data.get('activity_logs', [])
    tasks = data.get('tasks', [])
    historical_features = data.get('historical_features', [])

    features = FeatureEngineering.extract_activity_features(activity_logs)
    task_features = FeatureEngineering.extract_task_features(tasks)
    features.update(task_features)

    # Run all analyses
    prediction = predictor.predict(features)
    recommendations = recommender.recommend(features)
    anomalies = anomaly_detector.detect(features, historical_features)

    # Create summary
    summary = {
        'overall_status': prediction['risk_level'].upper(),
        'confidence': prediction['confidence'],
        'action_required': anomalies['has_critical_anomaly'],
        'priority_recommendations': recommendations['recommendations'][:3],
        'analysis_timestamp': datetime.now().isoformat(),
    }

    return jsonify({
        'status': 'success',
        'prediction': prediction,
        'recommendations': {
            'items': recommendations['recommendations'],
            'tips': recommender.get_personalized_tips(features),
            'total': recommendations['total_recommendations'],
        },
        'anomalies': {
            'detected': anomalies['anomalies'],
            'level': anomalies['anomaly_level'],
            'count': anomalies['anomalies_detected'],
        },
        'summary': summary,
    }), 200

# ==================== Feature Engineering Endpoints ====================

@app.route('/features/extract', methods=['POST'])
@handle_errors
def extract_features():
    """Extract features from raw data"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    activity_logs = data.get('activity_logs', [])
    tasks = data.get('tasks', [])
    records = data.get('financial_records', [])

    features = {}
    features.update(FeatureEngineering.extract_activity_features(activity_logs))
    features.update(FeatureEngineering.extract_task_features(tasks))
    features.update(FeatureEngineering.extract_finance_features(records))

    return jsonify({
        'status': 'success',
        'features': features,
        'feature_count': len(features),
    }), 200

# ==================== Model Info Endpoints ====================

@app.route('/models/info', methods=['GET'])
def models_info():
    """Get information about all models"""
    return jsonify({
        'status': 'success',
        'models': {
            'predictor': predictor.get_model_info(),
            'recommender': recommender.get_model_info(),
            'anomaly_detector': anomaly_detector.get_model_info(),
        },
        'service_version': '1.0',
    }), 200

# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found', 'status': 'error'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed', 'status': 'error'}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'status': 'error'}), 500

# ==================== Startup & Main ====================

if __name__ == '__main__':
    # Get configuration from environment
    HOST = os.getenv('ML_SERVICE_HOST', '127.0.0.1')
    PORT = int(os.getenv('ML_SERVICE_PORT', 5001))
    DEBUG = os.getenv('ML_SERVICE_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting ML Service on {HOST}:{PORT}")
    logger.info(f"Models loaded: predictor={predictor.trained}, recommender/anomaly_detector ready")

    app.run(host=HOST, port=PORT, debug=DEBUG)
