from flask import Blueprint, request, jsonify
import json
import random

bp = Blueprint('predict', __name__)

@bp.route('', methods=['POST'])
def predict_endpoint():
    try:
        data = request.get_json()
        features = data.get('features', {})
        
        # Extracted features fallback
        tasks_completed = features.get('tasks_completed_last_7d', 0)
        overdue = features.get('overdue_count', 0)
        
        # Mock ML logic (Simulates a pre-trained regression model)
        risk_score = min(max(50 + (overdue * 10) - (tasks_completed * 2), 0), 100)
        
        if risk_score > 75:
            risk_level = 'high'
        elif risk_score > 40:
            risk_level = 'medium'
        else:
            risk_level = 'low'
            
        return jsonify({
            'risk_level': risk_level,
            'risk_score': risk_score,
            'confidence': round(random.uniform(0.75, 0.95), 2),
            'features_analyzed': list(features.keys())
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400
