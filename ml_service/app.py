"""ML service entrypoint.

This module intentionally delegates to app_improved.py. The previous app.py
loaded a missing model.pkl at import time, which made the service crash before
Flask could start. app_improved.py uses the available rule-based models.
"""

import os

from app_improved import app, logger, predictor


if __name__ == "__main__":
    host = os.getenv("ML_SERVICE_HOST", "127.0.0.1")
    port = int(os.getenv("ML_SERVICE_PORT", 5001))
    debug = os.getenv("ML_SERVICE_DEBUG", "false").lower() == "true"

    logger.info("Starting ML Service through app.py wrapper")
    logger.info("Models loaded: predictor=%s, recommender/anomaly_detector ready", predictor.trained)

    app.run(host=host, port=port, debug=debug)
