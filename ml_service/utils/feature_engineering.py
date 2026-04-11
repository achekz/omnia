"""
Feature Engineering Utilities
Extract and prepare features for ML models
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

class FeatureEngineering:
    """Extract and engineer features from user data"""

    @staticmethod
    def extract_activity_features(activity_logs: List[Dict]) -> Dict[str, float]:
        """
        Extract features from activity logs (last 30 days)
        
        Returns:
            Dict with features for ML model
        """
        if not activity_logs:
            return FeatureEngineering._get_zero_features()

        # Group by date for daily stats
        daily_stats = {}
        for log in activity_logs:
            date_key = log.get('date', datetime.now().date())
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    'tasks_completed': 0,
                    'active_minutes': 0,
                    'login_count': 0,
                    'overdue_count': 0,
                }
            daily_stats[date_key]['tasks_completed'] += log.get('tasksCompleted', 0)
            daily_stats[date_key]['active_minutes'] += log.get('activeMinutes', 0)
            daily_stats[date_key]['login_count'] += log.get('loginCount', 0)
            daily_stats[date_key]['overdue_count'] += log.get('overdueCount', 0)

        # Calculate aggregate features
        total_days = len(daily_stats)
        if total_days == 0:
            return FeatureEngineering._get_zero_features()

        # 1. Activity intensity features
        total_tasks = sum(s['tasks_completed'] for s in daily_stats.values())
        total_active_minutes = sum(s['active_minutes'] for s in daily_stats.values())
        total_logins = sum(s['login_count'] for s in daily_stats.values())
        total_overdue = sum(s['overdue_count'] for s in daily_stats.values())

        avg_tasks_per_day = total_tasks / total_days
        avg_active_minutes_per_day = total_active_minutes / total_days
        avg_logins_per_day = total_logins / total_days

        # 2. Consistency features
        daily_tasks = [s['tasks_completed'] for s in daily_stats.values()]
        daily_active = [s['active_minutes'] for s in daily_stats.values()]

        task_consistency = np.std(daily_tasks) if len(daily_tasks) > 1 else 0
        activity_consistency = np.std(daily_active) if len(daily_active) > 1 else 0

        # 3. Trend features (last 7 days vs previous)
        sorted_dates = sorted(daily_stats.keys())
        if len(sorted_dates) >= 14:
            last_week = sorted_dates[-7:]
            prev_week = sorted_dates[-14:-7]

            last_week_tasks = sum(daily_stats[d]['tasks_completed'] for d in last_week)
            prev_week_tasks = sum(daily_stats[d]['tasks_completed'] for d in prev_week)

            task_trend = (last_week_tasks - prev_week_tasks) / max(prev_week_tasks, 1)
        else:
            task_trend = 0

        # 4. Performance score (0-100)
        performance_score = min(100, (avg_tasks_per_day * 10) + (avg_active_minutes_per_day / 10))

        # 5. Risk indicators
        missed_deadline_ratio = total_overdue / max(total_tasks, 1)
        engagement_rate = total_logins / max(total_days, 1)

        return {
            # Intensity metrics
            'tasks_completed_last_30d': float(total_tasks),
            'avg_daily_tasks': float(avg_tasks_per_day),
            'avg_daily_active_minutes': float(avg_active_minutes_per_day),
            'total_login_count': float(total_logins),
            'avg_daily_logins': float(avg_logins_per_day),

            # Consistency metrics
            'task_consistency': float(task_consistency),
            'activity_consistency': float(activity_consistency),

            # Trend metrics
            'task_trend_7d': float(task_trend),

            # Performance metrics
            'performance_score': float(performance_score),
            'missed_deadline_ratio': float(missed_deadline_ratio),
            'engagement_rate': float(engagement_rate),

            # Risk indicators
            'overdue_count_30d': float(total_overdue),
            'active_days_count': float(total_days),

            # Normalized features (0-1)
            'normalized_avg_tasks': float(min(1.0, avg_tasks_per_day / 10)),
            'normalized_active_minutes': float(min(1.0, avg_active_minutes_per_day / 120)),
        }

    @staticmethod
    def extract_task_features(tasks: List[Dict]) -> Dict[str, float]:
        """Extract features from task data"""
        if not tasks:
            return {
                'total_tasks': 0.0,
                'completed_tasks': 0.0,
                'pending_tasks': 0.0,
                'overdue_tasks': 0.0,
                'completion_rate': 0.0,
                'avg_task_duration_days': 0.0,
            }

        total = len(tasks)
        completed = len([t for t in tasks if t.get('status') == 'done'])
        pending = len([t for t in tasks if t.get('status') in ['todo', 'in-progress']])
        
        now = datetime.now()
        overdue = sum(1 for t in tasks 
                     if t.get('dueDate') and 
                     datetime.fromisoformat(str(t.get('dueDate'))) < now and
                     t.get('status') != 'done')

        completion_rate = completed / max(total, 1)

        # Calculate average task duration
        durations = []
        for task in tasks:
            if task.get('completedAt') and task.get('createdAt'):
                try:
                    created = datetime.fromisoformat(str(task.get('createdAt')))
                    completed = datetime.fromisoformat(str(task.get('completedAt')))
                    duration = (completed - created).days
                    durations.append(max(1, duration))
                except:
                    pass

        avg_duration = np.mean(durations) if durations else 0

        return {
            'total_tasks': float(total),
            'completed_tasks': float(completed),
            'pending_tasks': float(pending),
            'overdue_tasks': float(overdue),
            'completion_rate': float(completion_rate),
            'avg_task_duration_days': float(avg_duration),
        }

    @staticmethod
    def extract_finance_features(records: List[Dict]) -> Dict[str, float]:
        """Extract features from financial records"""
        if not records:
            return {
                'total_records': 0.0,
                'total_spending': 0.0,
                'avg_transaction': 0.0,
                'spending_variance': 0.0,
                'spending_trend': 0.0,
            }

        amounts = [r.get('amount', 0) for r in records]
        total_spending = sum(amounts)

        return {
            'total_records': float(len(records)),
            'total_spending': float(total_spending),
            'avg_transaction': float(np.mean(amounts)) if amounts else 0.0,
            'spending_variance': float(np.var(amounts)) if amounts else 0.0,
            'max_transaction': float(max(amounts)) if amounts else 0.0,
            'min_transaction': float(min(amounts)) if amounts else 0.0,
        }

    @staticmethod
    def normalize_features(features: Dict[str, float]) -> Dict[str, float]:
        """Normalize features to 0-1 range"""
        normalized = {}

        # Define normalization ranges
        ranges = {
            'tasks_completed_last_30d': (0, 100),
            'avg_daily_tasks': (0, 10),
            'avg_daily_active_minutes': (0, 480),  # 8 hours
            'total_login_count': (0, 30),
            'performance_score': (0, 100),
            'missed_deadline_ratio': (0, 1),
            'total_spending': (0, 100000),
        }

        for key, value in features.items():
            if key in ranges:
                min_val, max_val = ranges[key]
                normalized[key] = max(0, min(1, (value - min_val) / max(max_val - min_val, 1)))
            else:
                normalized[key] = value

        return normalized

    @staticmethod
    def _get_zero_features() -> Dict[str, float]:
        """Return zero features for empty input"""
        return {
            'tasks_completed_last_30d': 0.0,
            'avg_daily_tasks': 0.0,
            'avg_daily_active_minutes': 0.0,
            'total_login_count': 0.0,
            'avg_daily_logins': 0.0,
            'task_consistency': 0.0,
            'activity_consistency': 0.0,
            'task_trend_7d': 0.0,
            'performance_score': 0.0,
            'missed_deadline_ratio': 0.0,
            'engagement_rate': 0.0,
            'overdue_count_30d': 0.0,
            'active_days_count': 0.0,
            'normalized_avg_tasks': 0.0,
            'normalized_active_minutes': 0.0,
        }
