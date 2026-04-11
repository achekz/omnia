"""
ML Predictor Model
Risk prediction based on user activity patterns
"""

import numpy as np
import joblib
from pathlib import Path
from typing import Dict, List, Tuple
import json
from datetime import datetime

class UserRiskPredictor:
    """Predict user risk level based on activity features"""

    def __init__(self, model_path: str = None):
        """Initialize predictor with trained model"""
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.model_version = "1.0"
        self.trained = False

        if model_path:
            self.load_model(model_path)
        else:
            self._initialize_simple_model()

    def _initialize_simple_model(self):
        """Initialize a simple rule-based model (no sklearn dependency)"""
        self.feature_names = [
            'avg_daily_tasks',
            'avg_daily_active_minutes',
            'performance_score',
            'missed_deadline_ratio',
            'task_consistency',
            'engagement_rate',
        ]
        self.trained = True
        print("✅ Using rule-based model (no pre-trained weights)")

    def predict(self, features: Dict[str, float]) -> Dict:
        """
        Predict risk level for user
        
        Args:
            features: Dictionary of engineered features
            
        Returns:
            Dict with risk_level, risk_score, confidence, explanation
        """
        # Extract relevant features
        risk_score = self._calculate_risk_score(features)
        risk_level = self._classify_risk(risk_score)
        confidence = self._calculate_confidence(features)

        return {
            'risk_level': risk_level,
            'risk_score': round(float(risk_score), 4),
            'confidence': round(float(confidence), 4),
            'explanation': self._get_explanation(features, risk_score),
            'model_version': self.model_version,
            'timestamp': datetime.now().isoformat(),
        }

    def _calculate_risk_score(self, features: Dict[str, float]) -> float:
        """
        Calculate overall risk score (0-1)
        Lower score = lower risk (better)
        """
        risk_factors = []

        # 1. Activity factor (low activity = high risk)
        avg_tasks = features.get('avg_daily_tasks', 0)
        activity_risk = 1 - min(1, avg_tasks / 5)  # Good if >= 5 tasks/day
        risk_factors.append(('inactivity', activity_risk, 0.25))

        # 2. Deadline factor (missed deadlines = high risk)
        missed_ratio = features.get('missed_deadline_ratio', 0)
        deadline_risk = min(1, missed_ratio * 2)  # Risk increases with missed deadlines
        risk_factors.append(('deadline_miss', deadline_risk, 0.25))

        # 3. Consistency factor (inconsistency = risk)
        task_consistency = features.get('task_consistency', 0)
        consistency_risk = min(1, task_consistency / 10)  # > 10 std = high risk
        risk_factors.append(('inconsistency', consistency_risk, 0.20))

        # 4. Engagement factor (low engagement = risk)
        engagement = features.get('engagement_rate', 0)
        engagement_risk = 1 - min(1, engagement / 2)  # Good if >= 2 logins/day
        risk_factors.append(('low_engagement', engagement_risk, 0.15))

        # 5. Performance factor (low performance = risk)
        perf_score = features.get('performance_score', 0)
        performance_risk = 1 - min(1, perf_score / 100)
        risk_factors.append(('low_performance', performance_risk, 0.15))

        # Calculate weighted risk score
        total_risk = sum(
            score * weight for _, score, weight in risk_factors
        )

        # Ensure score is between 0 and 1
        return max(0, min(1, total_risk))

    def _classify_risk(self, risk_score: float) -> str:
        """Classify risk level based on score"""
        if risk_score < 0.3:
            return 'low'
        elif risk_score < 0.7:
            return 'medium'
        else:
            return 'high'

    def _calculate_confidence(self, features: Dict[str, float]) -> float:
        """
        Calculate confidence in prediction
        Full confidence if many days of data, lower if sparse
        """
        active_days = features.get('active_days_count', 0)
        
        # More days = more confident (max at 30 days)
        confidence = min(1.0, max(0.5, active_days / 30))
        
        # Lower confidence if missing key metrics
        required_features = [
            'avg_daily_tasks',
            'avg_daily_active_minutes',
            'missed_deadline_ratio',
            'engagement_rate',
        ]
        
        missing = sum(1 for f in required_features if f not in features or features[f] is None)
        confidence *= max(0.5, 1 - (missing * 0.1))
        
        return min(1.0, max(0.5, confidence))

    def _get_explanation(self, features: Dict[str, float], risk_score: float) -> str:
        """Generate human-readable explanation of risk assessment"""
        explanations = []

        avg_tasks = features.get('avg_daily_tasks', 0)
        if avg_tasks < 2:
            explanations.append("Low daily task completion (< 2 tasks/day)")
        elif avg_tasks > 7:
            explanations.append("High daily task completion (> 7 tasks/day)")

        missed_ratio = features.get('missed_deadline_ratio', 0)
        if missed_ratio > 0.3:
            explanations.append(f"High deadline miss rate ({missed_ratio*100:.0f}%)")

        engagement = features.get('engagement_rate', 0)
        if engagement < 1:
            explanations.append("Low engagement (< 1 login/day)")

        if not explanations:
            explanations.append("Generally stable performance")

        return " | ".join(explanations)

    def predict_batch(self, features_list: List[Dict]) -> List[Dict]:
        """Predict risk for multiple users"""
        return [self.predict(features) for features in features_list]

    def save_model(self, path: str):
        """Save model to disk"""
        try:
            model_data = {
                'feature_names': self.feature_names,
                'model_version': self.model_version,
                'trained': self.trained,
            }
            with open(path, 'w') as f:
                json.dump(model_data, f)
            print(f"✅ Model saved to {path}")
        except Exception as e:
            print(f"❌ Error saving model: {e}")

    def load_model(self, path: str):
        """Load model from disk"""
        try:
            with open(path, 'r') as f:
                model_data = json.load(f)
            self.feature_names = model_data.get('feature_names')
            self.model_version = model_data.get('model_version', '1.0')
            self.trained = model_data.get('trained', False)
            print(f"✅ Model loaded from {path}")
        except Exception as e:
            print(f"⚠️ Error loading model: {e}, using default")
            self._initialize_simple_model()

    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            'model_version': self.model_version,
            'trained': self.trained,
            'feature_count': len(self.feature_names) if self.feature_names else 0,
            'features': self.feature_names,
            'model_type': 'rule-based-predictor',
        }


# Initialize global predictor instance
predictor = UserRiskPredictor()
