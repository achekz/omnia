from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

model = joblib.load("model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    result = model.predict([data["features"]])
    return jsonify({
        "risk_score": int(result[0]),
        "risk_level": "medium",
        "confidence": 0.8
    })

@app.route("/")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=5001)