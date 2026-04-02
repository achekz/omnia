from flask import Blueprint, request, jsonify
import os
from openai import OpenAI

bp = Blueprint('ai', __name__)

@bp.route('/', methods=['POST'])
def ai_endpoint():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body required"}), 400

        prompt = data.get('prompt')
        user_role = data.get('user_role', 'general')
        context = data.get('context', {})

        if not prompt:
            return jsonify({"error": "prompt field required"}), 400

        # 🔑 GET API KEY
        api_key = os.getenv('OPENAI_API_KEY')

        if not api_key:
            return jsonify({
                "error": "OPENAI_API_KEY not configured"
            }), 500

        # 🧠 ROLE SYSTEM
        system_messages = {
            "employee": "You are a productivity assistant helping employees manage their tasks efficiently.",
            "company_admin": "You are a strategic business advisor analyzing company performance.",
            "cabinet_admin": "You are a financial expert analyzing financial risks and anomalies.",
            "student": "You are an academic assistant helping with studies and planning.",
            "general": "You are a helpful AI assistant like ChatGPT. Answer clearly and naturally."
        }

        system_msg = system_messages.get(user_role, system_messages["general"])

        # 🤖 INIT OPENAI
        client = OpenAI(api_key=api_key)

        print("🧠 Prompt reçu:", prompt)

        # ✅ OPENAI CALL (MODEL FIXED)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500,
        )

        # 🔍 VALIDATION
        if not response or not response.choices:
            raise Exception("Empty response from OpenAI")

        ai_response = response.choices[0].message.content.strip()

        print("✅ AI RESPONSE:", ai_response)

        return jsonify({
            "response": ai_response,
            "status": "success"
        }), 200

    except Exception as e:
        print("🚨 AI ERROR:", str(e))
        return jsonify({
            "error": "AI processing failed",
            "message": str(e)
        }), 500


@bp.route('/health', methods=['GET'])
def health_check():
    api_key = os.getenv('OPENAI_API_KEY')

    return jsonify({
        "status": "healthy" if api_key else "no_api_key",
        "service": "AI Assistant",
        "openai_configured": bool(api_key)
    }), 200