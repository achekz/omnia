# 🔧 Quick Integration Guide

## Current Status
✅ All 4 features implemented as separate modules
⏳ Ready for integration into existing routes
⏳ Awaiting server.js configuration

---

## 5-Minute Setup

### 1. Install Dependencies (1 min)
```bash
cd server
npm install express-validator swagger-jsdoc swagger-ui-express aws-sdk multer
npm install --save-dev @types/multer
```

### 2. Update server.js (3 min)
```javascript
import searchRoutes from './routes/search.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { setupSwagger } from './config/swagger.js';

// After middleware setup
setupSwagger(app);

// Mount new routes
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);

// Keep existing routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
// ... other routes
```

### 3. Add Validators to Existing Routes (2 min)
Update each route file to import and use validators:

**In `routes/auth.js`:**
```javascript
import { validateRegister, validateLogin, handleValidationErrors } from '../utils/validators.js';

router.post('/register', validateRegister, handleValidationErrors, register);
router.post('/login', validateLogin, handleValidationErrors, login);
```

**In `routes/tasks.js`:**
```javascript
import { validateCreateTask, handleValidationErrors } from '../utils/validators.js';

router.post('/', validateCreateTask, handleValidationErrors, createTask);
```

**In `routes/finance.js`:**
```javascript
import { validateCreateFinanceRecord, handleValidationErrors } from '../utils/validators.js';

router.post('/', validateCreateFinanceRecord, handleValidationErrors, createRecord);
```

---

## Environment Variables

### Update `.env` file:
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# API Documentation
SWAGGER_HOST=localhost:3000
SWAGGER_SCHEME=http
```

---

## MongoDB Text Indexes

Run this in MongoDB shell or create a migration:
```javascript
// Connect to your database
use omnia

// Create text indexes for search functionality
db.tasks.createIndex({ title: 'text', description: 'text' });
db.users.createIndex({ name: 'text', email: 'text' });
db.financialrecords.createIndex({ description: 'text' });

// Verify indexes created
db.tasks.getIndexes();
```

---

## Test the Integration

### 1. Swagger Docs (should see /api-docs)
```bash
curl http://localhost:3000/api-docs
```

### 2. Test Input Validation
```bash
# This should fail validation
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak"
  }'

# Response:
# {
#   "success": false,
#   "message": "Validation failed",
#   "errors": [
#     "email must be a valid email",
#     "password must be at least 8 characters"
#   ]
# }
```

### 3. Test File Upload
```bash
# First, get a valid JWT token from login
TOKEN="your-jwt-token"

# Upload a file
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Response:
# {
#   "success": true,
#   "file": {
#     "url": "https://bucket.s3.amazonaws.com/uploads/...",
#     "size": 12345,
#     "type": "application/pdf"
#   }
# }
```

### 4. Test Advanced Search
```bash
curl -X POST http://localhost:3000/api/search/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "important",
    "status": "pending",
    "priority": "high",
    "sort": "date",
    "page": 1,
    "limit": 10
  }'
```

---

## File Structure After Integration

```
server/
├── config/
│   └── swagger.js ✨ NEW
├── controllers/
│   ├── authController.js
│   ├── taskController.js
│   └── fileController.js ✨ NEW
├── routes/
│   ├── auth.js (with validators)
│   ├── tasks.js (with validators)
│   ├── search.routes.js ✨ NEW
│   └── upload.routes.js ✨ NEW
├── services/
│   └── searchService.js ✨ NEW
└── utils/
    └── validators.js ✨ NEW

API Endpoints After Integration:
├── /api/docs (Swagger UI) ✨ NEW
├── /api-json (Swagger JSON) ✨ NEW
├── /api/search/* ✨ NEW FEATURE
└── /api/upload/* ✨ NEW FEATURE
```

---

## Troubleshooting

### Issue: Swagger doesn't appear at /api-docs
**Solution:** Make sure setupSwagger is called before app.listen()
```javascript
setupSwagger(app);
app.listen(3000);
```

### Issue: File upload returns 403
**Solution:** Check AWS credentials and S3 bucket permissions
```javascript
// Verify in server logs
console.log(process.env.AWS_S3_BUCKET);
console.log(process.env.AWS_ACCESS_KEY_ID);
```

### Issue: Search returns no results
**Solution:** Ensure MongoDB text indexes are created
```javascript
// In MongoDB shell
db.tasks.getIndexes()
// Should show: "title_text_description_text"
```

### Issue: Validation always passes (not working)
**Solution:** Make sure validator middleware is before controller
```javascript
// ✅ CORRECT
router.post('/register', validateRegister, handleValidationErrors, register);

// ❌ WRONG
router.post('/register', register, validateRegister);
```

---

## Performance Tips

1. **Search Optimization**
   - Create text indexes on frequently searched fields
   - Use pagination (default 15 items per page)
   - Consider caching popular searches with Redis

2. **File Upload Optimization**
   - Use multipart/form-data for large files
   - Implement chunked uploads for files > 100MB
   - Monitor S3 costs (pay per upload/download)

3. **Validation Optimization**
   - Validators run before database queries
   - Prevents invalid data from reaching DB
   - Reduces server load

---

## Next: Advanced Features (Optional)

After basic integration works:

1. **Add Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

2. **Add Caching**
   ```bash
   npm install redis ioredis
   ```

3. **Add File Virus Scanning**
   ```bash
   npm install clamscan
   ```

4. **Add Email Notifications**
   - Notify user on file upload completion
   - Alert on unusual search activity

---

## Deployment Checklist

Before pushing to production:

- [ ] All environment variables set in production
- [ ] AWS S3 bucket configured and secured
- [ ] MongoDB text indexes created on production DB
- [ ] Swagger documentation reviewed and accurate
- [ ] File upload file types validated
- [ ] Input validators protecting against injection attacks
- [ ] Error messages don't expose sensitive information
- [ ] Search performance tested with large datasets
- [ ] Rate limiting configured (if using)
- [ ] SSL/TLS certificates installed
- [ ] CORS properly configured
- [ ] CSRF protection enabled
- [ ] Sentry/monitoring configured
- [ ] Database backups scheduled

---

## Support Resources

- 📚 **Validation**: https://express-validator.github.io/docs/
- 📚 **Swagger**: https://swagger.io/docs/specification/v3_0_0/
- 📚 **AWS S3**: https://docs.aws.amazon.com/s3/
- 📚 **Multer**: https://github.com/expressjs/multer
- 📚 **MongoDB Text Search**: https://docs.mongodb.com/manual/text-search/

---

**Ready to integrate? Start with Step 1 above!**
