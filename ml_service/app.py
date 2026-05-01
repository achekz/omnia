from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

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


if __name__ == "__main__":
    app.run(port=5000, debug=True)