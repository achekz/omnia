from flask import Blueprint, request, jsonify

bp = Blueprint('recommend', __name__)

ROLE_ALIASES = {
    'student': 'stagiaire',
    'etudiant': 'stagiaire',
    'étudiant': 'stagiaire',
    'intern': 'stagiaire',
    'accountant': 'comptable',
    'cabinet': 'comptable',
    'company': 'admin',
    'company_admin': 'admin',
    'cabinet_admin': 'admin',
    'manager': 'admin',
    'rh': 'employee',
    'hr': 'employee',
    'employe': 'employee',
    'employé': 'employee',
    'user': 'employee',
}

def normalize_role(value):
    key = str(value or 'employee').strip().lower()
    return ROLE_ALIASES.get(key, key if key in ['admin', 'employee', 'stagiaire', 'comptable'] else 'employee')

@bp.route('', methods=['POST'])
def recommend_endpoint():
    try:
        data = request.get_json()
        context = data.get('context', {})
        
        profile = normalize_role(context.get('profileType') or context.get('role'))
        pending = context.get('pending_tasks_count', 0)
        
        recs = []
        
        if profile == 'stagiaire':
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
        elif profile == 'admin' or profile == 'comptable':
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
