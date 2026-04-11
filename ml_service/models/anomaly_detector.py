"""
Anomaly Detection Model
Detect unusual user behavior patterns
"""

from typing import Dict, List, Tuple
from datetime import datetime
import numpy as np

class AnomalyDetector:
    """Detect anomalies in user behavior"""

    def __init__(self):
        """Initialize anomaly detector"""
        self.model_version = "1.0"
        
        # Anomaly thresholds (can be tuned)
        self.thresholds = {
            'zero_activity': 0.0,  # No activity for days
            'extreme_spike': 3.0,  # 3x normal activity
            'extreme_drop': 0.2,   # 80% drop in activity
            'deadline_crisis': 0.5,  # >50% missed deadlines
            'engagement_loss': 0.3,  # <0.3 logins per day
        }

    def detect(self, features: Dict[str, float], historical_features: List[Dict] = None) -> Dict:
        """
        Detect anomalies in user behavior
        
        Args:
            features: Current engineered features
            historical_features: List of past feature sets for trend analysis
            
        Returns:
            Dict with detected anomalies and severity
        """
        anomalies = []

        # 1. Zero Activity Anomaly
        if features.get('avg_daily_tasks', 0) == 0 and features.get('avg_daily_active_minutes', 0) == 0:
            anomalies.append({
                'type': 'zero_activity',
                'severity': 'high',
                'description': 'No activity detected in recent period',
                'recommendation': 'User may be inactive or in distress',
            })

        # 2. Extreme Activity Spike
        if historical_features:
            hist_avg_tasks = np.mean([f.get('avg_daily_tasks', 0) for f in historical_features])
            current_tasks = features.get('avg_daily_tasks', 0)
            
            if hist_avg_tasks > 0 and current_tasks > hist_avg_tasks * self.thresholds['extreme_spike']:
                anomalies.append({
                    'type': 'extreme_spike',
                    'severity': 'medium',
                    'description': f'Activity {current_tasks/hist_avg_tasks:.1f}x higher than usual',
                    'recommendation': 'Monitor for potential burnout',
                })

        # 3. Extreme Activity Drop
        if historical_features:
            hist_avg_tasks = np.mean([f.get('avg_daily_tasks', 0) for f in historical_features])
            current_tasks = features.get('avg_daily_tasks', 0)
            
            if hist_avg_tasks > 0 and current_tasks < hist_avg_tasks * self.thresholds['extreme_drop']:
                anomalies.append({
                    'type': 'extreme_drop',
                    'severity': 'high',
                    'description': f'Activity dropped to {current_tasks/hist_avg_tasks*100:.0f}% of normal',
                    'recommendation': 'Check in with user to understand the decline',
                })

        # 4. Deadline Crisis
        missed_ratio = features.get('missed_deadline_ratio', 0)
        if missed_ratio > self.thresholds['deadline_crisis']:
            anomalies.append({
                'type': 'deadline_crisis',
                'severity': 'high',
                'description': f'Missed {missed_ratio*100:.0f}% of deadlines',
                'recommendation': 'User may need deadline extension or task reduction',
            })

        # 5. Engagement Loss
        engagement = features.get('engagement_rate', 0)
        if engagement < self.thresholds['engagement_loss']:
            anomalies.append({
                'type': 'engagement_loss',
                'severity': 'medium',
                'description': f'Low engagement rate ({engagement:.2f} logins/day)',
                'recommendation': 'Encourage more frequent check-ins',
            })

        # 6. Inconsistent Pattern
        consistency = features.get('task_consistency', 0)
        if consistency > 15:  # Very high standard deviation
            anomalies.append({
                'type': 'inconsistent_pattern',
                'severity': 'low',
                'description': 'Highly variable task completion patterns',
                'recommendation': 'Help establish a more consistent routine',
            })

        # 7. Negative Trend
        trend = features.get('task_trend_7d', 0)
        if trend < -0.5:  # 50% decline
            anomalies.append({
                'type': 'negative_trend',
                'severity': 'medium',
                'description': f'Task completion trending down ({trend*100:.0f}%)',
                'recommendation': 'Investigate cause of declining performance',
            })

        return {
            'anomalies_detected': len(anomalies),
            'anomalies': anomalies,
            'anomaly_level': self._classify_anomaly_level(anomalies),
            'has_critical_anomaly': any(a['severity'] == 'high' for a in anomalies),
            'model_version': self.model_version,
            'timestamp': datetime.now().isoformat(),
        }

    def _classify_anomaly_level(self, anomalies: List[Dict]) -> str:
        """Classify overall anomaly level"""
        if not anomalies:
            return 'normal'
        
        high_count = sum(1 for a in anomalies if a['severity'] == 'high')
        
        if high_count >= 2:
            return 'critical'
        elif high_count >= 1:
            return 'warning'
        else:
            return 'minor'

    def detect_batch(self, features_list: List[Dict]) -> List[Dict]:
        """Detect anomalies for multiple users"""
        return [self.detect(features) for features in features_list]

    def get_alert_actions(self, anomalies: List[Dict]) -> List[Dict]:
        """Get recommended actions based on detected anomalies"""
        actions = []

        for anomaly in anomalies:
            anom_type = anomaly['type']
            
            if anom_type == 'zero_activity':
                actions.append({
                    'action_type': 'immediate_followup',
                    'message': 'Contact user immediately to check status',
                    'priority': 'critical',
                    'channel': 'email_and_notification',
                })

            elif anom_type == 'extreme_drop':
                actions.append({
                    'action_type': 'wellcheck',
                    'message': 'Schedule a check-in call with user',
                    'priority': 'high',
                    'channel': 'message',
                })

            elif anom_type == 'deadline_crisis':
                actions.append({
                    'action_type': 'deadline_review',
                    'message': 'Review and extend deadlines if needed',
                    'priority': 'high',
                    'channel': 'system',
                })

            elif anom_type == 'engagement_loss':
                actions.append({
                    'action_type': 'engagement_boost',
                    'message': 'Send motivational content',
                    'priority': 'medium',
                    'channel': 'notification',
                })

        # Remove duplicates
        seen = set()
        unique_actions = []
        for action in actions:
            action_str = str(action)
            if action_str not in seen:
                seen.add(action_str)
                unique_actions.append(action)

        return unique_actions

    def get_severity_distribution(self, users_anomalies: List[Dict]) -> Dict:
        """Get distribution of anomaly severities across users"""
        severities = {'high': 0, 'medium': 0, 'low': 0}
        total_anomalies = 0

        for user_result in users_anomalies:
            for anomaly in user_result.get('anomalies', []):
                severity = anomaly.get('severity', 'low')
                if severity in severities:
                    severities[severity] += 1
                total_anomalies += 1

        return {
            'total_anomalies': total_anomalies,
            'by_severity': severities,
            'high_percentage': (severities['high'] / total_anomalies * 100) if total_anomalies > 0 else 0,
            'critical_users': sum(1 for a in users_anomalies if a.get('has_critical_anomaly', False)),
        }

    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            'model_version': self.model_version,
            'model_type': 'rule-based-anomaly-detector',
            'anomaly_types': [
                'zero_activity',
                'extreme_spike',
                'extreme_drop',
                'deadline_crisis',
                'engagement_loss',
                'inconsistent_pattern',
                'negative_trend',
            ],
            'thresholds': self.thresholds,
        }


# Initialize global anomaly detector instance
anomaly_detector = AnomalyDetector()
