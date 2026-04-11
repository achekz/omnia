"""
ML Recommender Model
Personalized recommendations based on user behavior
"""

from typing import Dict, List, Tuple
from datetime import datetime
import json

class RecommendationEngine:
    """Generate personalized recommendations for users"""

    def __init__(self):
        """Initialize recommendation engine"""
        self.model_version = "1.0"
        
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
                        'description': f"You\'re missing {f.get('missed_deadline_ratio', 0)*100:.0f}% of deadlines",
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

    def recommend(self, features: Dict[str, float]) -> Dict:
        """
        Generate recommendations for user
        
        Args:
            features: Engineered features
            
        Returns:
            Dict with recommendations and explanations
        """
        recommendations = []
        
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
            'timestamp': datetime.now().isoformat(),
        }

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
            'model_type': 'rule-based-recommender',
            'rule_count': len(self.recommendation_rules),
            'rules': list(self.recommendation_rules.keys()),
        }


# Initialize global recommender instance
import numpy as np
recommender = RecommendationEngine()
