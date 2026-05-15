from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # ✅ Autorise React (port 5173) à parler à Flask (port 5000)

# -------- LOAD MODELS --------
risk_model = joblib.load("trained_models/risk_predictor.pkl")


# ----------- RISK -----------
@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400
    result = risk_model.predict([data])
    return jsonify({"risk": float(result[0])})


# ----------- RECOMMENDATION -----------
@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400
    return jsonify({
        "recommendations": [
            "Improve task planning",
            "Reduce delays",
            "Increase productivity"
        ]
    })


# ----------- ANOMALY -----------
@app.route("/detect-anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400
    avg = sum(data) / len(data)
    last = data[-1]
    is_anomaly = last > avg * 2
    return jsonify({
        "is_anomaly": is_anomaly,
        "anomaly_score": float(last / avg if avg > 0 else 0)
    })


@app.route("/ml/predict-delay", methods=["POST"])
def predict_delay():
    data = request.get_json() or {}
    delays = [float(v) for v in data.get("past_delays", []) if v is not None]
    avg_delay = float(data.get("avg_delay", sum(delays) / len(delays) if delays else 0))
    late_count = int(data.get("late_count", 0))
    absence_count = int(data.get("absence_count", 0))
    risk_score = min(1.0, (avg_delay / 120.0) + (late_count * 0.08) + (absence_count * 0.03))
    return jsonify({
        "risk_score": round(risk_score, 3),
        "risk_level": "high" if risk_score >= 0.7 else "medium" if risk_score >= 0.4 else "low",
        "confidence": 0.78,
        "recommendations": [
            "Send an early reminder before the expected start time",
            "Review schedule flexibility for users with repeated delay patterns",
        ],
    })


@app.route("/ml/anomaly", methods=["POST"])
def presence_anomaly():
    data = request.get_json() or {}
    delays = [float(v) for v in data.get("delays", []) if v is not None]
    statuses = data.get("statuses", [])
    repeated_absences = max(
        "".join("A" if s == "absent" else "P" for s in statuses).count("AAA"), 0
    )
    if not delays:
        return jsonify({
            "is_anomaly": bool(repeated_absences),
            "anomaly_score": 0.5 if repeated_absences else 0.0,
            "signals": []
        })
    avg = sum(delays) / len(delays)
    latest = delays[-1]
    score = min(1.0, abs(latest - avg) / 120.0 + repeated_absences * 0.25)
    return jsonify({
        "is_anomaly": score >= 0.6,
        "anomaly_score": round(score, 3),
        "signals": ["unusual_delay"] if score >= 0.6 else [],
    })


# ✅ Route Gemini — AVANT app.run() !
@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    data = request.get_json() or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Message vide"}), 400

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    if not GEMINI_API_KEY:
        return jsonify({"reply": "Clé API Gemini manquante."}), 500

    gemini_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [{"parts": [{"text": message}]}]
    }

    try:
        response = requests.post(gemini_url, json=payload, timeout=15)
        response.raise_for_status()
        result = response.json()
        reply = (
            result
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "Pas de réponse de l'IA.")
        )
        return jsonify({"reply": reply})
    except requests.exceptions.Timeout:
        return jsonify({"reply": "L'IA met trop de temps à répondre."}), 504
    except Exception as e:
        return jsonify({"reply": f"Erreur: {str(e)}"}), 500


# ✅ app.run() toujours EN DERNIER
if __name__ == "__main__":
    app.run(port=5000, debug=True)