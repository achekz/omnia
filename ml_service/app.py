from flask import Flask, request, jsonify
from flask_cors import CORS
from routes import predict, recommend, anomaly, ai

import os
print("API KEY:", os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app)

# Register routes
app.register_blueprint(predict.bp, url_prefix='/predict')
app.register_blueprint(recommend.bp, url_prefix='/recommend')
app.register_blueprint(anomaly.bp, url_prefix='/anomaly')
app.register_blueprint(ai.bp, url_prefix='/ai')

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "OmniAI ML Service"})

if __name__ == '__main__':
    from waitress import serve
    print("🚀 ML Service starting on port 5001...")
    serve(app, host="0.0.0.0", port=5001)
