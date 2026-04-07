# 🔍 Quick Verification Checklist

## Run This Before Testing Registration

```bash
cd server && node seed/testMongoDB.js
```

---

## Expected Output ✅

```
🔍 Testing MongoDB Connection...

📋 Configuration Check:
   MONGO_URI defined: ✅ Yes
   URI preview: mongodb+srv://...

🔗 Attempting connection...
✅ Connection successful!

📊 Database Info:
   Host: your-cluster.mongodb.net
   Database: omniai
   State: Connected
   Collections: X
     - users
     - organizations
     - tasks
     - (etc...)

✅ Everything looks good! You can now register accounts.
```

---

## What to Check

### ✅ Step 1: Is `.env` file created?
```bash
ls -la server/.env
# Should show: -rw-r--r--  server/.env
```

### ✅ Step 2: Does `.env` have MONGO_URI?
```bash
grep MONGO_URI server/.env
# Should show: MONGO_URI=mongodb+srv://...
```

### ✅ Step 3: Can server connect to MongoDB?
```bash
cd server
node seed/testMongoDB.js
# Should show: ✅ Connection successful!
```

### ✅ Step 4: Is server running?
```bash
npm run dev
# Should show logs like:
# ✅ MongoDB Connected: cluster.mongodb.net
# 🚀 Server running in development mode on port 5000
```

### ✅ Step 5: Can you see the database?
1. Go to **MongoDB Atlas**
2. Click your **Cluster**
3. Should see **"omniai"** database listed
4. Inside should see **"users"** collection

---

## If Something is ❌ Wrong

| Problem | Check |
|---------|-------|
| MONGO_URI undefined | Add it to `.env` |
| Connection timeout | Whitelist IP in Atlas |
| Authentication failed | Verify credentials |
| No database | Registration didn't work yet |
| Collections empty | No users created yet |

---

## Test Registration Manually

```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Create account via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "profileType": "employee"
  }'

# Response should be: 201 Created
# With user data and tokens
```

---

## Verify Account was Saved

### Via MongoDB Atlas UI:
1. Atlas → omniai database → users collection
2. Should see your new account

### Via Terminal:
```bash
# View all users
cd server
node -e "
  require('dotenv').config();
  const mongoose = require('mongoose');
  const User = require('./models/User.js').default;
  
  mongoose.connect(process.env.MONGO_URI).then(() => {
    User.find({}).then(users => {
      console.log('Users:', users);
      process.exit(0);
    });
  });
"
```

---

## All Clear? ✅

If all checks pass, then:
1. ✅ Go to http://localhost:5173/register
2. ✅ Fill the form
3. ✅ Click "Create Account"
4. ✅ Account saves to MongoDB automatically!

Ready to go! 🚀
