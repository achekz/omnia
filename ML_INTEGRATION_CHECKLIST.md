"""
ML SYSTEM INTEGRATION CHECKLIST
Step-by-step guide to integrate the ML system into existing backend
"""

## 📋 Integration Checklist

### Phase 1: Setup (5-10 minutes)

- [ ] Navigate to `ml_service/` directory
- [ ] Install Python dependencies: `pip install -r requirements.txt`
- [ ] Create `.env` file with configuration
- [ ] Test Flask app startup: `python app_improved.py`
- [ ] Verify health endpoint: `curl http://localhost:5001/health`

**Expected Result:** ML service running on port 5001 and responding to health checks

---

### Phase 2: Backend Integration (10-15 minutes)

#### Step 1: Update mlController.js

**Current Code:**
```javascript
import mlService from '../services/mlService.js';

export const predictRisk = asyncHandler(async (req, res) => {
  const { activityLogs, tasks } = req.body;
  const result = mlService.predict(userId, activityLogs, tasks);
  // ...
});
```

**New Code:**
```javascript
import mlClient from '../services/mlServiceEnhanced.js';

export const predictRisk = asyncHandler(async (req, res) => {
  const { activityLogs, tasks } = req.body;
  const result = await mlClient.predict(
    req.user._id,
    activityLogs,
    tasks
  );
  
  if (result.error && !result.success) {
    console.warn('ML Service fallback active:', result.error);
  }
  
  return res.json(
    new ApiResponse(200, result, 'Risk prediction complete')
  );
});
```

**Files to Update:**
- [ ] `server/controllers/mlController.js` - Update all predict methods
- [ ] `server/services/mlService.js` - Can be deleted or kept for reference
- [ ] Add imports: `import mlClient from '../services/mlServiceEnhanced.js'`

#### Step 2: Update server.js

Add ML service health check on startup:

```javascript
import mlClient from './services/mlServiceEnhanced.js';

// After Express initialization
const startServer = async () => {
  try {
    // ... existing database connection ...
    
    // Check ML service health
    const mlHealth = await mlClient.healthCheck();
    if (mlHealth.success) {
      console.log('✅ ML Service healthy');
    } else {
      console.warn('⚠️  ML Service unavailable - fallback predictions active');
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

- [ ] Add health check in startup sequence
- [ ] Add logging for ML service status

#### Step 3: Environment Variables

Update `.env` in root directory:

```env
# Existing variables...
PORT=8000
MONGODB_URI=...

# New ML Service Variables
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_RETRIES=3
```

- [ ] Add ML_SERVICE_URL to `.env`
- [ ] Add ML_SERVICE_TIMEOUT to `.env`
- [ ] Add ML_SERVICE_RETRIES to `.env`

#### Step 4: Update Routes

Ensure ML routes are properly hooked up:

```javascript
// In server.js or routes setup
app.use('/api/ml', mlRoutes);

// Routes should include:
// POST /api/ml/predict
// POST /api/ml/predict/batch
// POST /api/ml/recommend
// POST /api/ml/anomalies
// POST /api/ml/anomalies/batch
// POST /api/ml/analyze
// GET /api/ml/status
```

- [ ] Verify `/api/ml` routes are registered
- [ ] Test all ML endpoints manually

---

### Phase 3: Testing (15-20 minutes)

#### Test 1: Health Check
```bash
curl http://localhost:5001/health
```

Expected:
```json
{
  "status": "healthy",
  "service": "ML Service",
  "models": {
    "predictor": true,
    "recommender": true,
    "anomaly_detector": true
  }
}
```

- [ ] Health check returns 200
- [ ] All models show as ready

#### Test 2: Feature Extraction
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
      {"status": "done"},
      {"status": "todo"}
    ]
  }'
```

- [ ] Returns features with 25+ attributes
- [ ] No errors in response

#### Test 3: Prediction
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

- [ ] Returns risk_level (low/medium/high)
- [ ] Returns risk_score (0-1)
- [ ] Returns confidence (0-1)
- [ ] Returns explanation

#### Test 4: Recommendations
```bash
curl -X POST http://localhost:5001/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "activity_logs": [{"tasksCompleted": 5}],
    "tasks": [{"status": "done"}]
  }'
```

- [ ] Returns recommendations array
- [ ] Returns tips array
- [ ] Returns next_actions array

#### Test 5: Anomalies
```bash
curl -X POST http://localhost:5001/anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "activity_logs": [{"tasksCompleted": 0}],
    "tasks": []
  }'
```

- [ ] Returns anomalies array
- [ ] Returns severity level
- [ ] Returns alert actions

#### Test 6: Backend Integration
```bash
# Test via Node.js backend
curl -X POST http://localhost:8000/api/ml/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activity_logs": [...],
    "tasks": [...]
  }'
```

- [ ] Backend successfully calls ML service
- [ ] Response includes all ML data
- [ ] Error handling works (fallback active if ML service down)

#### Test 7: Batch Operations
```bash
curl -X POST http://localhost:5001/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "userId": "user1",
        "activity_logs": [...],
        "tasks": [...]
      },
      {
        "userId": "user2",
        "activity_logs": [...],
        "tasks": [...]
      }
    ]
  }'
```

- [ ] Batch processing works
- [ ] Returns results for all users
- [ ] Performance acceptable (<5s for 10 users)

---

### Phase 4: Monitoring (5-10 minutes)

#### Setup Logging
Create `ml_service/logging_config.py`:

```python
import logging
import logging.handlers

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    
    # File handler
    fh = logging.handlers.RotatingFileHandler(
        'ml_service.log',
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    fh.setLevel(logging.INFO)
    
    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger

# In app_improved.py
from logging_config import setup_logging
logger = setup_logging()
```

- [ ] Logging configured
- [ ] Log file creation verified
- [ ] Logs rotating properly

#### Monitor Service
```bash
# Watch logs in real-time
tail -f ml_service.log

# Check error rates
grep ERROR ml_service.log | wc -l

# Monitor memory usage (in another terminal)
watch -n 1 'ps aux | grep python'
```

- [ ] No critical errors in logs
- [ ] Memory usage stable
- [ ] Response times reasonable

---

### Phase 5: Documentation (5 minutes)

- [ ] Update README.md with ML system setup
- [ ] Document ML endpoints in API docs
- [ ] Add environment variable reference
- [ ] Document feature requirements for each ML call
- [ ] Create runbook for common issues

---

## 🚀 Integration Test Scenarios

### Scenario 1: Low Activity User
```json
{
  "activity_logs": [
    {"tasksCompleted": 1, "activeMinutes": 30, "loginCount": 1}
  ],
  "tasks": [{"status": "pending"}]
}
```

**Expected ML Response:**
- risk_level: "medium" or "high"
- Recommendations include task breakdown and goal setting
- Anomalies might include low_engagement

### Scenario 2: Overdue Crisis
```json
{
  "activity_logs": [
    {"tasksCompleted": 2, "overdueCount": 5}
  ],
  "tasks": [
    {"status": "todo", "daysOverdue": 10},
    {"status": "todo", "daysOverdue": 8}
  ]
}
```

**Expected ML Response:**
- risk_level: "high"
- Recommendations focus on deadline management
- Anomalies: deadline_crisis

### Scenario 3: High Performer
```json
{
  "activity_logs": [
    {"tasksCompleted": 10, "performanceScore": 95}
  ],
  "tasks": [
    {"status": "completed"},
    {"status": "completed"}
  ]
}
```

**Expected ML Response:**
- risk_level: "low"
- Recommendations: achievement and challenge
- No anomalies

---

## 🐛 Common Issues & Solutions

### Issue: "ML Service unavailable"
**Root Cause:** Flask app not running
**Solution:**
1. Check Flask is running: `ps aux | grep python`
2. Restart: `python app_improved.py`
3. Check port: `netstat -an | grep 5001`

### Issue: "Connection timeout"
**Root Cause:** Network issue or Flask crashed
**Solution:**
1. Check ML service logs
2. Verify URL in mlServiceEnhanced.js
3. Ping service: `curl -v http://localhost:5001/health`

### Issue: "Invalid response from ML service"
**Root Cause:** API changed or data format incorrect
**Solution:**
1. Check ML_SERVICE_URL configuration
2. Verify request format matches API spec
3. Check response in browser: http://localhost:5001/predict

### Issue: "Memory usage high"
**Root Cause:** Large batch sizes or memory leak
**Solution:**
1. Reduce batch size from 100 to 50
2. Monitor with: `top -pid $(pgrep python)`
3. Restart service daily (add to cron)

---

## 📊 Performance Benchmarks

Expected performance metrics:

| Operation | Time | Notes |
|-----------|------|-------|
| Health check | <100ms | Should be instant |
| Single prediction | 50-100ms | Feature extraction + calculation |
| Batch prediction (10 users) | 500-800ms | Linear with user count |
| Recommendation | 50-100ms | Rule-based, fast |
| Anomaly detection | 50-100ms | Rule-based, fast |
| Complete analysis | 150-300ms | All 3 operations combined |

**Optimization Tips:**
- Use batch endpoints for multiple users
- Cache results for repeated requests
- Monitor response times in logs
- Scale to multiple Flask instances if needed

---

## ✅ Final Verification

- [ ] ML service running: `curl http://localhost:5001/health`
- [ ] Backend can reach service
- [ ] All endpoints tested manually
- [ ] Logging configured and working
- [ ] Performance acceptable
- [ ] Error handling in place
- [ ] Documentation updated
- [ ] Team trained
- [ ] Ready for production deployment

---

## 📞 Next Steps

1. **Immediate:** Complete Phase 1 setup (5 minutes)
2. **Day 1:** Complete Phase 2-3 integration (30 minutes)
3. **Day 1:** Complete Phase 4-5 optimization (15 minutes)
4. **Day 2+:** Deploy to staging and test with real data

---

**Last Updated:** April 11, 2024
**Integration Version:** 1.0
**Estimated Time to Complete:** 60 minutes
