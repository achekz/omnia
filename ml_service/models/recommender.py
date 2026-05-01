"""
ML Recommender Model
Personalized recommendations based on user behavior
"""

from typing import Dict, List, Tuple
from datetime import datetime
import json
from pathlib import Path

try:
    import joblib
except ModuleNotFoundError:
    joblib = None

class RecommendationEngine:
    """Generate personalized recommendations for users"""

    def __init__(self):
        """Initialize recommendation engine"""
        self.model_version = "1.0"
        self.model = None
        self.catalog = []
        self.vectorizer = None
        self.nearest_neighbors = None
        self.item_matrix = None
        
        # Recommendation rules
        self.recommendation_rules = {
            'low_activity': {
                'condition': lambda f: f.get('avg_daily_tasks', 0) < 2,
                'recommendations': [
                    {
                        'category': 'productivity',
                        'title': 'Increase Daily Tasks',
                        'description': 'Try completing at least 3-5 tasks daily',
                        'priority': 'high',
                        'action': 'set_daily_goal',
                    },
                    {
                        'category': 'motivation',
                        'title': 'Break Tasks into Smaller Steps',
                        'description': 'Smaller tasks are easier to complete',
                        'priority': 'medium',
                        'action': 'task_breakdown',
                    },
                ]
            },
            'high_consistency': {
                'condition': lambda f: f.get('task_consistency', 0) < 2,
                'recommendations': [
                    {
                        'category': 'consistency',
                        'title': 'Maintain Your Routine',
                        'description': 'You have great consistency - keep it up!',
                        'priority': 'medium',
                        'action': 'maintain_consistency',
                    },
                ]
            },
            'many_overdue': {
                'condition': lambda f: f.get('missed_deadline_ratio', 0) > 0.2,
                'recommendations': [
                    {
                        'category': 'time_management',
                        'title': 'Improve Deadline Management',
                        'description': 'Your missed deadline rate is above the recommended threshold',
                        'priority': 'high',
                        'action': 'deadline_planning',
                    },
                    {
                        'category': 'planning',
                        'title': 'Set Realistic Deadlines',
                        'description': 'Allocate more time for complex tasks',
                        'priority': 'high',
                        'action': 'deadline_extension',
                    },
                ]
            },
            'low_engagement': {
                'condition': lambda f: f.get('engagement_rate', 0) < 1,
                'recommendations': [
                    {
                        'category': 'engagement',
                        'title': 'Increase Daily Check-ins',
                        'description': 'Log in at least once daily to stay connected',
                        'priority': 'medium',
                        'action': 'daily_checkin',
                    },
                ]
            },
            'high_performance': {
                'condition': lambda f: f.get('performance_score', 0) > 70,
                'recommendations': [
                    {
                        'category': 'achievement',
                        'title': 'Excellent Performance!',
                        'description': 'You\'re doing great! Consider taking on more challenges',
                        'priority': 'low',
                        'action': 'increase_goals',
                    },
                ]
            },
        }
        default_model_path = Path(__file__).resolve().parents[1] / "trained_models" / "recommendation_content_based.pkl"
        if default_model_path.exists():
            self.load_model(str(default_model_path))

    def recommend(self, features: Dict[str, float]) -> Dict:
        """
        Generate recommendations for user
        
        Args:
            features: Engineered features
            
        Returns:
            Dict with recommendations and explanations
        """
        recommendations = self._recommend_with_trained_model(features)
        
        # Apply each rule
        for rule_name, rule in self.recommendation_rules.items():
            try:
                if rule['condition'](features):
                    recommendations.extend(rule['recommendations'])
            except Exception as e:
                print(f"Error in rule {rule_name}: {e}")

        # Sort by priority (high > medium > low)
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(
            key=lambda r: priority_order.get(r.get('priority', 'low'), 3)
        )

        # Limit to top 5 recommendations
        recommendations = recommendations[:5]

        return {
            'recommendations': recommendations,
            'total_recommendations': len(recommendations),
            'categories': list(set(r['category'] for r in recommendations)),
            'model_version': self.model_version,
            'model_type': 'ContentBased-TFIDF-NearestNeighbors' if self.model is not None else 'rule-based-recommender',
            'timestamp': datetime.now().isoformat(),
        }

    def _profile_text(self, features: Dict[str, float]) -> str:
        role = features.get('role') or features.get('profileType') or 'employee'
        avg_tasks = float(features.get('avg_daily_tasks', 0) or 0)
        missed_ratio = float(features.get('missed_deadline_ratio', 0) or 0)
        performance_score = float(features.get('performance_score', 0) or 0)
        engagement = float(features.get('engagement_rate', 0) or 0)
        task_trend = float(features.get('task_trend_7d', 0) or 0)

        activity = "low activity" if avg_tasks < 2 else "steady activity" if avg_tasks < 6 else "high activity"
        deadlines = "deadline risk" if missed_ratio > 0.25 else "healthy deadlines"
        performance = "low performance" if performance_score < 45 else "strong performance" if performance_score > 75 else "average performance"
        engagement_text = "low engagement" if engagement < 1 else "regular engagement"
        trend = "declining trend" if task_trend < -0.25 else "improving trend" if task_trend > 0.25 else "stable trend"
        return f"{role} {activity} {deadlines} {performance} {engagement_text} {trend}"

    def _recommend_with_trained_model(self, features: Dict[str, float]) -> List[Dict]:
        if self.model is None or not self.vectorizer or not self.nearest_neighbors or not self.catalog:
            return []

        try:
            query = self.vectorizer.transform([self._profile_text(features)])
            count = min(3, len(self.catalog))
            _, indices = self.nearest_neighbors.kneighbors(query, n_neighbors=count)
            recommendations = []
            for index in indices[0]:
                item = self.catalog[int(index)]
                recommendations.append({
                    'category': item.get('category', 'general'),
                    'title': item.get('title', 'Recommended action'),
                    'description': item.get('text', item.get('title', 'Recommended action')),
                    'priority': item.get('priority', 'medium'),
                    'action': item.get('id', 'content_based_recommendation'),
                    'source': 'trained_content_based_model',
                })
            return recommendations
        except Exception as e:
            print(f"Content recommender error: {e}")
            return []

    def recommend_batch(self, features_list: List[Dict]) -> List[Dict]:
        """Generate recommendations for multiple users"""
        return [self.recommend(features) for features in features_list]

    def get_personalized_tips(self, features: Dict[str, float]) -> List[str]:
        """Get personalized tips based on features"""
        tips = []

        # Task-based tips
        avg_tasks = features.get('avg_daily_tasks', 0)
        if avg_tasks < 1:
            tips.append("Try completing at least 1 task daily to build momentum")
        elif 1 <= avg_tasks < 3:
            tips.append("Good start! Aim for 3-5 tasks daily for better progress")
        elif avg_tasks >= 5:
            tips.append("Great productivity! Keep maintaining this pace")

        # Time management tips
        avg_time = features.get('avg_daily_active_minutes', 0)
        if avg_time < 30:
            tips.append("Spend more time on your work - aim for 1-2 hours daily")
        elif avg_time >= 120:
            tips.append("You're investing great effort! Don't forget to take breaks")

        # Deadline tips
        missed_ratio = features.get('missed_deadline_ratio', 0)
        if missed_ratio > 0:
            tips.append(f"Try to reduce missed deadlines - currently at {missed_ratio*100:.0f}%")

        # Engagement tips
        engagement = features.get('engagement_rate', 0)
        if engagement < 1:
            tips.append("Try logging in daily to stay on top of your tasks")

        return tips[:5]  # Return top 5 tips

    def suggest_next_actions(self, features: Dict[str, float]) -> List[Dict]:
        """Suggest next actions for user to take"""
        actions = []

        # Performance-based actions
        perf_score = features.get('performance_score', 0)
        
        if perf_score < 30:
            actions.append({
                'action': 'review_goals',
                'title': 'Review Your Goals',
                'description': 'Your current goals might be too ambitious',
                'urgency': 'high',
            })

        # Deadline-based actions
        overdue = features.get('overdue_count_30d', 0)
        if overdue > 0:
            actions.append({
                'action': 'clear_overdue',
                'title': f'Clear {int(overdue)} Overdue Tasks',
                'description': 'Complete or reschedule overdue items',
                'urgency': 'high',
            })

        # Engagement-based actions
        if features.get('active_days_count', 0) < 10:
            actions.append({
                'action': 'increase_engagement',
                'title': 'Engage More Often',
                'description': 'Try to log in more frequently for better tracking',
                'urgency': 'medium',
            })

        return actions

    def compare_with_peers(self, user_features: Dict[str, float], 
                          peer_features_list: List[Dict]) -> Dict:
        """Compare user metrics with peer group"""
        if not peer_features_list:
            return {'comparison': None, 'message': 'No peer data available'}

        peer_avg_tasks = np.mean([f.get('avg_daily_tasks', 0) for f in peer_features_list])
        peer_avg_time = np.mean([f.get('avg_daily_active_minutes', 0) for f in peer_features_list])
        peer_completion = np.mean([f.get('completion_rate', 0) for f in peer_features_list])

        user_tasks = user_features.get('avg_daily_tasks', 0)
        user_time = user_features.get('avg_daily_active_minutes', 0)
        user_completion = user_features.get('completion_rate', 0)

        comparison = {
            'tasks': {
                'user': user_tasks,
                'peer_avg': peer_avg_tasks,
                'difference': user_tasks - peer_avg_tasks,
                'status': 'above' if user_tasks > peer_avg_tasks else 'below',
            },
            'active_time': {
                'user': user_time,
                'peer_avg': peer_avg_time,
                'difference': user_time - peer_avg_time,
                'status': 'above' if user_time > peer_avg_time else 'below',
            },
            'completion_rate': {
                'user': user_completion,
                'peer_avg': peer_completion,
                'difference': user_completion - peer_completion,
                'status': 'above' if user_completion > peer_completion else 'below',
            },
        }

        return {
            'comparison': comparison,
            'peer_count': len(peer_features_list),
            'timestamp': datetime.now().isoformat(),
        }

    def get_model_info(self) -> Dict:
        """Get model information"""
        return {
            'model_version': self.model_version,
            'model_type': 'ContentBased-TFIDF-NearestNeighbors' if self.model is not None else 'rule-based-recommender',
            'rule_count': len(self.recommendation_rules),
            'rules': list(self.recommendation_rules.keys()),
            'catalog_size': len(self.catalog),
        }

    def load_model(self, path: str):
        """Load trained content-based recommendation artifact"""
        try:
            if joblib is None:
                raise RuntimeError("joblib is not installed")
            model_data = joblib.load(path)
            self.model = model_data
            self.model_version = model_data.get('model_version', self.model_version)
            self.catalog = model_data.get('catalog', [])
            self.vectorizer = model_data.get('vectorizer')
            self.nearest_neighbors = model_data.get('nearest_neighbors')
            self.item_matrix = model_data.get('item_matrix')
            print(f"Trained recommendation model loaded from {path}")
        except Exception as e:
            print(f"Error loading recommendation model: {e}, using rule-based fallback")


# Initialize global recommender instance
import numpy as np
recommender = RecommendationEngine()
