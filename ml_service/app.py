from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# Charger modèles
risk_model = joblib.load("trained_models/risk_predictor.pkl")
reco_model = joblib.load("trained_models/recommendation_content_based.pkl")
anomaly_model = joblib.load("trained_models/anomaly_detector.pkl")


@app.route("/")
def home():
    return "ML Service Running"


# ----------- RISK -----------
@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    data = request.json.get("features")

    if data is None:
        return jsonify({"error": "features missing"}), 400

    result = [0]  # test
    return jsonify({"risk": float(result[0])})


# ----------- RECOMMENDATION -----------
@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json["features"]
    result = reco_model.predict([data])
    return jsonify({"recommendation": result.tolist()})


# ----------- ANOMALY -----------
@app.route("/detect-anomaly", methods=["POST"])
def detect_anomaly():
    data = request.json["features"]
    result = anomaly_model.predict([data])
    return jsonify({"anomaly": int(result[0])})


if __name__ == "__main__":
    app.run(debug=True, port=5000)