from flask import Blueprint, request, jsonify
import numpy as np

bp = Blueprint('anomaly', __name__)

@bp.route('', methods=['POST'])
def anomaly_endpoint():
    try:
        data = request.get_json()
        values = data.get('values', [])
        
        if not values or not isinstance(values, list) or len(values) == 0:
            return jsonify({'error': 'values array is required'}), 400
            
        # Mock logic: find Z-score of the last element compared to the rest
        # If there's only 1 element, we can't calculate a true z-score, 
        # but if it's > 10000 we'll flag it
        
        is_anomaly = False
        anomaly_score = 0.0
        
        latest_val = float(values[-1])
        
        if len(values) > 5:
            hist = np.array(values[:-1])
            mean = np.mean(hist)
            std = np.std(hist)
            if std == 0: 
                std = 1 
            z_score = abs(latest_val - mean) / std
            
            anomaly_score = min(z_score / 4.0, 1.0) # normalize 0-1
            if z_score > 2.5: # 2.5 std deviations
                is_anomaly = True
        else:
            if latest_val > 5000:
                is_anomaly = True
                anomaly_score = 0.8
                
        return jsonify({
            'is_anomaly': bool(is_anomaly),
            'anomaly_score': round(float(anomaly_score), 2),
            'value_analyzed': latest_val
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400
