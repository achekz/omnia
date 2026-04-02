from flask import Blueprint, request, jsonify
import requests

bp = Blueprint('ai', __name__)

@bp.route('/', methods=['POST'])
def ai_endpoint():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body required"}), 400

        prompt = data.get('prompt')

        if not prompt:
            return jsonify({"error": "prompt required"}), 400

        print("🧠 Prompt reçu:", prompt)

        # 🔥 CALL OLLAMA (tinyllama)
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "tinyllama",
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )

        # 🔴 vérifier erreur Ollama
        if response.status_code != 200:
            return jsonify({
                "error": "Ollama request failed",
                "details": response.text
            }), 500

        result = response.json()

        ai_response = result.get("response")

        if not ai_response:
            return jsonify({
                "error": "Empty response from AI"
            }), 500

        print("✅ AI RESPONSE:", ai_response)

        return jsonify({
            "response": ai_response,
            "status": "success"
        })

    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to Ollama (is it running?)"
        }), 500

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({
            "error": str(e)
        }), 500


@bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "ai": "ollama",
        "model": "tinyllama"
    })