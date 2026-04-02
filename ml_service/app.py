from flask import Flask, jsonify
from flask_cors import CORS

# Import routes
from routes import predict, recommend, anomaly, ai

app = Flask(__name__)
CORS(app)

# ✅ REGISTER ROUTES
app.register_blueprint(predict.bp, url_prefix='/predict')
app.register_blueprint(recommend.bp, url_prefix='/recommend')
app.register_blueprint(anomaly.bp, url_prefix='/anomaly')
app.register_blueprint(ai.bp, url_prefix='/ai')

# ✅ HEALTH CHECK
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "OmniAI ML Service",
        "ai": "ollama (tinyllama)"
    })

# 🚀 START SERVER
if __name__ == '__main__':
    from waitress import serve
    print("🚀 ML Service running on http://localhost:5001")
    serve(app, host="0.0.0.0", port=5001)