from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

app = Flask(__name__)
CORS(app)  # ✅ Autorise React (port 5173) à parler à Flask (port 5000)

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "trained_models"

# -------- LOAD MODELS --------
risk_model = joblib.load(MODELS_DIR / "risk_predictor.pkl")
recommendation_model = joblib.load(MODELS_DIR / "recommendation_content_based.pkl")
anomaly_model = joblib.load(MODELS_DIR / "anomaly_detector.pkl")


def _as_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _risk_artifact_pipeline():
    if isinstance(risk_model, dict):
        return risk_model.get("pipeline") or risk_model.get("model")
    return risk_model


def _risk_feature_names():
    if isinstance(risk_model, dict):
        return risk_model.get("feature_names") or []
    return []


def normalize_risk_features(raw_features):
    """Accept old 5-value input from Express and convert it to trained model features."""
    if isinstance(raw_features, dict):
        tasks_completed = _as_float(raw_features.get("tasks_completed_last_7d"))
        active_minutes = _as_float(raw_features.get("avg_daily_active_minutes"))
        missed_deadlines = _as_float(raw_features.get("deadlines_missed_last_30d"))
        login_frequency = _as_float(raw_features.get("login_frequency"))
        overdue_count = _as_float(raw_features.get("overdue_count"))
    else:
        values = list(raw_features or [])
        tasks_completed = _as_float(values[0] if len(values) > 0 else 0)
        active_minutes = _as_float(values[1] if len(values) > 1 else 0)
        missed_deadlines = _as_float(values[2] if len(values) > 2 else 0)
        login_frequency = _as_float(values[3] if len(values) > 3 else 0)
        overdue_count = _as_float(values[4] if len(values) > 4 else missed_deadlines)

    avg_daily_tasks = tasks_completed / 7.0
    completion_rate = min(1.0, tasks_completed / max(tasks_completed + overdue_count, 1.0))
    missed_deadline_ratio = min(1.0, missed_deadlines / max(tasks_completed + missed_deadlines, 1.0))
    engagement_rate = min(5.0, login_frequency / 2.0)
    active_days_count = min(30.0, login_frequency)
    task_consistency = max(0.0, min(18.0, overdue_count + missed_deadline_ratio * 6.0))
    task_trend_7d = max(-1.0, min(1.0, completion_rate - missed_deadline_ratio))
    performance_score = max(
        0.0,
        min(
            100.0,
            avg_daily_tasks * 9.0
            + active_minutes / 9.0
            + completion_rate * 25.0
            - missed_deadline_ratio * 35.0
            - task_consistency * 1.2,
        ),
    )

    feature_map = {
        "avg_daily_tasks": avg_daily_tasks,
        "avg_daily_active_minutes": active_minutes,
        "performance_score": performance_score,
        "missed_deadline_ratio": missed_deadline_ratio,
        "task_consistency": task_consistency,
        "engagement_rate": engagement_rate,
        "active_days_count": active_days_count,
        "overdue_count_30d": overdue_count,
        "completion_rate": completion_rate,
        "task_trend_7d": task_trend_7d,
    }

    names = _risk_feature_names()
    if names:
        return [feature_map.get(name, 0.0) for name in names]

    return [
        tasks_completed,
        active_minutes,
        missed_deadlines,
        login_frequency,
        overdue_count,
    ]


def _profile_text_from_features(features):
    values = normalize_risk_features(features)
    names = _risk_feature_names()
    mapped = dict(zip(names, values)) if names else {}
    avg_tasks = mapped.get("avg_daily_tasks", _as_float(values[0] if values else 0))
    missed_ratio = mapped.get("missed_deadline_ratio", 0)
    performance_score = mapped.get("performance_score", 50)
    engagement = mapped.get("engagement_rate", 1)
    trend = mapped.get("task_trend_7d", 0)

    activity = "low activity" if avg_tasks < 2 else "steady activity" if avg_tasks < 6 else "high activity"
    deadlines = "deadline risk" if missed_ratio > 0.25 else "healthy deadlines"
    performance = "low performance" if performance_score < 45 else "strong performance" if performance_score > 75 else "average performance"
    engagement_text = "low engagement" if engagement < 1 else "regular engagement"
    trend_text = "declining trend" if trend < -0.25 else "improving trend" if trend > 0.25 else "stable trend"

    return f"employee {activity} {deadlines} {performance} {engagement_text} {trend_text}"


def _fallback_recommendations(features):
    values = normalize_risk_features(features)
    names = _risk_feature_names()
    mapped = dict(zip(names, values)) if names else {}
    missed_ratio = mapped.get("missed_deadline_ratio", 0)
    performance_score = mapped.get("performance_score", 50)
    overdue_count = mapped.get("overdue_count_30d", _as_float(values[4] if len(values) > 4 else 0))

    recommendations = []
    if overdue_count > 0 or missed_ratio > 0.25:
        recommendations.append("Plan deadlines earlier and prioritize overdue work.")
    if performance_score < 55:
        recommendations.append("Use focused work sessions and reduce parallel tasks.")
    recommendations.append("Keep a daily task goal and review progress at the end of the day.")
    return recommendations[:3]


# ----------- RISK -----------
@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400

    features = normalize_risk_features(data)
    model = _risk_artifact_pipeline()
    if model is None:
        return jsonify({"error": "risk model missing"}), 500

    if hasattr(model, "predict_proba"):
        risk = float(model.predict_proba([features])[0][1])
    else:
        result = model.predict([features])
        risk = float(result[0])

    risk = max(0.0, min(1.0, risk))
    return jsonify({
        "risk": risk,
        "risk_score": risk,
        "risk_level": "high" if risk >= 0.7 else "medium" if risk >= 0.4 else "low",
        "confidence": 0.82,
        "features_used": _risk_feature_names() or "legacy_5_features",
    })


# ----------- RECOMMENDATION -----------
@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400

    recommendations = []
    if isinstance(recommendation_model, dict):
        try:
            vectorizer = recommendation_model.get("vectorizer")
            nearest_neighbors = recommendation_model.get("nearest_neighbors")
            catalog = recommendation_model.get("catalog") or []
            if vectorizer and nearest_neighbors and catalog:
                query = vectorizer.transform([_profile_text_from_features(data)])
                distances, indices = nearest_neighbors.kneighbors(
                    query,
                    n_neighbors=min(3, len(catalog)),
                )
                for distance, index in zip(distances[0], indices[0]):
                    item = catalog[int(index)]
                    recommendations.append(
                        item.get("title")
                        or item.get("text")
                        or item.get("id")
                        or "Review your work plan"
                    )
        except Exception:
            recommendations = []

    if not recommendations:
        recommendations = _fallback_recommendations(data)

    return jsonify({
        "recommendations": recommendations,
        "source": "content_based_model" if isinstance(recommendation_model, dict) else "fallback",
    })


# ----------- ANOMALY -----------
@app.route("/detect-anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json.get("features")
    if data is None:
        return jsonify({"error": "features missing"}), 400

    if isinstance(anomaly_model, dict) and anomaly_model.get("pipeline"):
        try:
            features = normalize_risk_features(data)
            pipeline = anomaly_model["pipeline"]
            prediction = int(pipeline.predict([features])[0])
            score = float(pipeline.decision_function([features])[0])
            anomaly_score = max(0.0, min(1.0, 0.5 - score))
            return jsonify({
                "is_anomaly": prediction == -1,
                "anomaly_score": anomaly_score,
                "source": "isolation_forest",
            })
        except Exception:
            pass

    values = [_as_float(value) for value in data]
    if not values:
        return jsonify({"error": "features must not be empty"}), 400

    avg = sum(values) / len(values)
    last = values[-1]
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
    port = int(os.getenv("ML_SERVICE_PORT", "5001"))
    app.run(port=port, debug=True)
