"""
COMPLETE MACHINE LEARNING SYSTEM SETUP GUIDE
Production-ready ML models for user analytics and predictions
"""

## 🤖 ML System Architecture

The ML system consists of 4 main components:

### 1. **Feature Engineering** (`utils/feature_engineering.py`)
- Extracts meaningful features from raw data
- Activity metrics (tasks, time, engagement)
- Consistency and trend analysis
- Performance scoring
- Risk indicators

### 2. **Risk Predictor** (`models/predictor.py`)
- Predicts user risk level (low/medium/high)
- Risk scoring algorithm
- Confidence calculation
- Explanations in natural language
- Weighted risk factors

### 3. **Recommendation Engine** (`models/recommender.py`)
- Personalized recommendations
- Smart tips and suggestions
- Next action recommendations
- Peer comparison metrics

### 4. **Anomaly Detector** (`models/anomaly_detector.py`)
- Detects unusual behavior patterns
- 7 types of anomalies
- Severity classification
- Alert actions
- Critical issue detection

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- pip or conda

### Step 1: Install Python Dependencies

```bash
cd ml_service
pip install -r requirements.txt
```

**Key packages:**
- Flask 2.3.3 - Web framework
- numpy 1.24.3 - Numerical computing
- scikit-learn 1.3.0 - ML utilities
- pandas 2.0.3 - Data manipulation

### Step 2: Environment Variables

Create `.env` file in ml_service/:

```env
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=false

# Service Configuration
ML_SERVICE_HOST=127.0.0.1
ML_SERVICE_PORT=5001
ML_SERVICE_TIMEOUT=30000

# Logging
LOG_LEVEL=INFO
```

### Step 3: Start ML Service

```bash
python app_improved.py
```

You should see:
```
Starting ML Service on 127.0.0.1:5001
Models loaded: predictor=True, recommender/anomaly_detector ready
 * Running on http://127.0.0.1:5001
```

### Step 4: Verify Service

```bash
curl http://localhost:5001/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "ML Service",
  "models": { ... }
}
```

---

## 🧪 Testing the ML System

### Test 1: Health Check
```bash
curl http://localhost:5001/health
```

### Test 2: Feature Extraction
```bash
curl -X POST http://localhost:5001/features/extract \
  -H "Content-Type: application/json" \
  -d '{
    "activity_logs": [
      {
        "date": "2024-04-11",
        "tasksCompleted": 5,
        "activeMinutes": 120,
        "loginCount": 2,
        "overdueCount": 0
      }
    ],
    "tasks": [
      {
        "title": "Task 1",
        "status": "done",
        "dueDate": "2024-04-15"
      }
    ]
  }'
```

### Test 3: Prediction
```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "activity_logs": [
      {
        "tasksCompleted": 5,
        "activeMinutes": 120,
        "loginCount": 2,
        "overdueCount": 0
      }
    ],
    "tasks": [
      {"status": "done"},
      {"status": "todo"}
    ]
  }'
```

### Test 4: Complete Analysis
```bash
curl -X POST http://localhost:5001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "activity_logs": [...],
    "tasks": [...],
    "historical_features": [...]
  }'
```

---

## 🔌 Integration with Node.js Backend

### Update server.js

```javascript
import mlClient from './services/mlServiceEnhanced.js';

// In your ML controller
export const predict = asyncHandler(async (req, res) => {
  const { activityLogs, tasks } = req.body;
  
  // Call ML service with retry logic
  const result = await mlClient.predict(
    req.user._id,
    activityLogs,
    tasks
  );

  if (!result.success) {
    console.warn('ML Service unavailable, using fallback:', result.error);
  }

  return res.json(
    new ApiResponse(200, result, 'Prediction complete')
  );
});
```

### Environment Variables (Node.js)

```env
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_RETRIES=3
```

---

## 📊 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /status` - Service status
- `GET /models/info` - Model information

### Single User Analysis
- `POST /predict` - Predict risk level
- `POST /recommend` - Get recommendations
- `POST /anomalies` - Detect anomalies
- `POST /analyze` - Complete analysis

### Batch Operations
- `POST /predict/batch` - Batch predictions
- `POST /anomalies/batch` - Batch anomaly detection

### Utilities
- `POST /features/extract` - Extract features
- `POST /features/normalize` - Normalize features

---

## 🎯 ML Models Details

### Risk Predictor
**Input features:**
- avg_daily_tasks
- avg_daily_active_minutes
- performance_score
- missed_deadline_ratio
- task_consistency
- engagement_rate

**Output:**
- risk_level: "low" | "medium" | "high"
- risk_score: 0.0-1.0
- confidence: 0.0-1.0
- explanation: String

**Algorithm:** Weighted risk factors
```
risk_score = 0.25*inactivity 
           + 0.25*deadline_miss 
           + 0.20*inconsistency 
           + 0.15*low_engagement 
           + 0.15*low_performance
```

### Recommendation Engine
**Input features:** Same as predictor

**Output:** 
- recommendations: Array of personalized recommendations
- tips: Array of tips (max 5)
- next_actions: Array of action items

**Rules:**
1. Low activity → Increase daily tasks
2. High consistency → Maintain routine
3. Many overdue → Improve deadline management
4. Low engagement → Increase daily check-ins
5. High performance → Take on more challenges

### Anomaly Detector
**7 Anomaly Types:**
1. **zero_activity** - No activity detected
2. **extreme_spike** - 3x normal activity
3. **extreme_drop** - 80% drop from normal
4. **deadline_crisis** - >50% missed deadlines
5. **engagement_loss** - <0.3 logins/day
6. **inconsistent_pattern** - High std deviation
7. **negative_trend** - 50% decline

**Severity Levels:**
- high - Requires immediate action
- medium - Should be monitored
- low - Minor issue

---

## 🚀 Deployment

### Docker Support (Optional)
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY ml_service/requirements.txt .
RUN pip install -r requirements.txt

COPY ml_service/ .

EXPOSE 5001
CMD ["python", "app_improved.py"]
```

**Build and run:**
```bash
docker build -t ml-service .
docker run -p 5001:5001 ml-service
```

### Production Settings
```python
# app_improved.py
if __name__ == '__main__':
    app.run(
        host='0.0.0.0',        # Listen on all interfaces
        port=5001,
        debug=False,           # Disable debug mode
        threaded=True,         # Enable threading
        use_reloader=False     # Disable auto-reload
    )
```

---

## 📈 Monitoring & Logging

### Check Service Status
```bash
curl http://localhost:5001/status
```

### Monitor Logs
```bash
# Stream logs
tail -f ml_service.log

# Check specific errors
grep ERROR ml_service.log
```

### Performance Monitoring
- Request latency
- Error rates
- Number of anomaly detections
- Model accuracy (when trained model available)

---

## 🔧 Troubleshooting

### Issue: Service won't start
```bash
# Check port is available
netstat -an | grep 5001

# Kill existing process
lsof -ti:5001 | xargs kill -9
```

### Issue: Timeout errors
```python
# Increase timeout in mlServiceEnhanced.js
mlClient.setTimeout(60000);  // 60 seconds
```

### Issue: Resource issues
```python
# Limit batch size
MAX_BATCH_SIZE = 50

# Add response compression
from flask_compress import Compress
Compress(app)
```

---

## 📚 Advanced Usage

### Custom Rules
Add custom recommendation rules in `models/recommender.py`:

```python
self.recommendation_rules['custom_rule'] = {
    'condition': lambda f: f.get('custom_metric', 0) > 0.7,
    'recommendations': [
        {
            'category': 'custom',
            'title': 'Custom Recommendation',
            'description': 'Your custom logic',
        }
    ]
}
```

### Custom Anomalies
Add custom anomaly detection in `models/anomaly_detector.py`:

```python
@property
def custom_thresholds(self):
    self.thresholds['custom_metric'] = 0.8
```

### Train Your Own Model
Replace rule-based predictor with scikit-learn model:

```python
from sklearn.ensemble import RandomForestClassifier

def _initialize_trained_model(self):
    self.model = RandomForestClassifier(n_estimators=100)
    # Load trained model
    self.model = joblib.load('model.pkl')
```

---

## ✅ Production Checklist

- [ ] All environment variables configured
- [ ] ML service running and healthy
- [ ] Health check endpoint responding
- [ ] Node.js backend can reach ML service
- [ ] Error handling and fallbacks in place
- [ ] Logging configured and monitored
- [ ] Load testing completed
- [ ] Backup ML service (optional)
- [ ] Documentation updated
- [ ] Team trained on system

---

## 📞 Support & Contact

For issues or questions:
1. Check logs: `ml_service.log`
2. Test endpoint: `http://localhost:5001/health`
3. Review error responses from API

---

## 🎓 Learning Resources

- Scikit-learn: https://scikit-learn.org/
- Flask: https://flask.palletsprojects.com/
- Feature Engineering: https://machinelearningmastery.com/feature-engineering/
- Anomaly Detection: https://en.wikipedia.org/wiki/Anomaly_detection

**Last Updated:** April 11, 2024
**ML Service Version:** 1.0
