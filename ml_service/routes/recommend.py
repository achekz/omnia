from flask import Blueprint, request, jsonify

bp = Blueprint('recommend', __name__)

@bp.route('', methods=['POST'])
def recommend_endpoint():
    try:
        data = request.get_json()
        context = data.get('context', {})
        
        profile = context.get('profileType', 'employee')
        pending = context.get('pending_tasks_count', 0)
        
        recs = []
        
        if profile == 'student':
            if pending > 3:
                recs = [
                    "Break your upcoming assignments into smaller 25-minute Pomodoro sessions.",
                    "Review past exam materials today before starting new chapters.",
                    "Your study load is heavy; consider postponing non-urgent tasks."
                ]
            else:
                recs = [
                    "Great job staying on top of your studying. Consider reviewing lighter topics.",
                    "Prepare notes for next week's classes early."
                ]
        elif profile == 'cabinet' or profile == 'company':
            recs = [
                "Review outstanding pending approvals to unblock your team.",
                "Check financial anomaly reports generated in the last 24h.",
                "Schedule a quick 15-minute sync with underperforming employees."
            ]
        else: # employee
            if pending > 5:
                recs = [
                    "You have a high number of pending tasks. Focus on the 'High' priority ones first.",
                    "Ask for help or delegate if you're feeling overwhelmed.",
                    "Disable notifications for the next two hours to focus deeply."
                ]
            else:
                recs = [
                    "Your workload is manageable. Consider picking up a backlog issue.",
                    "Document your recent completed tasks for the weekly review.",
                    "Take a moment to update your project status."
                ]
                
        return jsonify({
            'recommendations': recs,
            'context_analyzed': list(context.keys())
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400
