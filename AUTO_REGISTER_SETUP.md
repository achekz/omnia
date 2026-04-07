# ✅ Register Accounts Automatically to MongoDB - Complete Setup Guide

## 🎯 Problem
New accounts are not being saved to MongoDB Atlas automatically.

## ✅ Solution: 3 Simple Steps

---

## Step 1️⃣: Create and Configure `.env` File

### A) Create the file
```bash
cd server
cp .env.example .env
```

### B) Edit `server/.env` with your MongoDB URI

Open `server/.env` in VS Code and fill **ONLY 2 things**:

```env
# 1️⃣ YOUR MONGODB URI FROM ATLAS
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/omniai?retryWrites=true&w=majority

# 2️⃣ RANDOM JWT SECRETS (can be anything random, 32+ characters)
JWT_SECRET=abc123def456ghi789jkl000mno111pqr222stu333vwx444yz
JWT_REFRESH_SECRET=zzz999yyy888xxx777www666vvv555uuu444ttt333sss222rrr111qqq

# Rest can stay as default
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
```

---

## ⚠️ Important: Get Your MongoDB URI

### Where to get `MONGO_URI`:
1. Go to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**
2. Click your **Cluster**
3. Click **"Connect"** button
4. Choose **"Drivers"** tab
5. Select **"Node.js"** version **4.x or 5.x**
6. **Copy the connection string**
7. It will look like:
```
mongodb+srv://myusername:mypassword@mycluster.mongodb.net/omniai?retryWrites=true&w=majority
```
8. **Replace** `myusername`, `mypassword`, and `mycluster` with **YOUR REAL VALUES**
9. Paste into `MONGO_URI=` in `.env`

### Important Settings in MongoDB Atlas:
✅ **Add your IP to Network Access**
  - Go to Atlas → Network Access
  - Click "Add IP Address"
  - Enter your computer's IP or click "Add Current IP Address"
  - Click Confirm

✅ **Whitelist Your IP**
  - Without this, connection will timeout!

---

## Step 2️⃣: Test MongoDB Connection

**Before creating accounts, test if MongoDB works:**

```bash
cd server
node seed/testMongoDB.js
```

### ✅ Success Output:
```
✅ Connection successful!
📊 Database Info:
   Host: your-cluster.mongodb.net
   Database: omniai
   Collections: X
```

### ❌ Common Errors:

**Error: "MONGO_URI undefined"**
- Reason: No `.env` file or empty
- Fix: Create `.env` and add MONGO_URI

**Error: "connect ECONNREFUSED"**
- Reason: IP not whitelisted
- Fix: Add your IP to MongoDB Atlas Network Access

**Error: "authentication failed"**
- Reason: Bad username/password
- Fix: Check credentials in MongoDB Atlas

**Error: "ServerSelectionTimeout"**
- Reason: Can't reach MongoDB
- Fix: Check internet connection + IP whitelist

---

## Step 3️⃣: Restart Server and Test Registration

### A) Restart Backend Server

**Terminal 1:**
```bash
cd server
npm run dev
```

**Expected Output:**
```
✅ MongoDB Connected: cluster.mongodb.net
✅ Database: omniai
🚀 Server running in development mode on port 5000
```

### B) Start Frontend (if not running)

**Terminal 2:**
```bash
npm run dev
```

### C) Test Creating Account

1. Go to **http://localhost:5173/register**
2. Fill the form:
   - **Full Name**: `John Doe`
   - **Email**: `john@example.com`
   - **Password**: `TestPassword123`
   - **Role**: Select any (Employee, Student, Company, Cabinet)
   - **Organization** (if Company/Cabinet): `My Company`
3. Click **"Create Account"**

### ✅ Success Signs:
- See: **"Account created!"** message
- Redirected to Dashboard
- **Can login** with new credentials

### Verify in MongoDB Atlas:
1. MongoDB Atlas → Collections → omniai → users
2. Should see your new account there! ✅

---

## 🔧 Fix Existing Accounts (If any)

If you had old accounts that don't work:

```bash
cd server
node seed/fixPasswordHashing.js
```

**Output:**
```
📊 Found X users
✅ Fixed: Y accounts
✅ Already correct: Z
```

Now old accounts will login properly too!

---

## 📊 Complete Checklist

- [ ] Created `server/.env` file
- [ ] Copied `.env.example` to `.env`
- [ ] Added MONGO_URI to `.env`
- [ ] Added JWT_SECRET to `.env`
- [ ] Ran `node seed/testMongoDB.js` ✅
- [ ] Restarted server (`npm run dev`)
- [ ] Tested registration at `/register`
- [ ] New account appears in MongoDB Atlas ✅

---

## 🆘 Troubleshooting

### Registration Says "Could not create account"

**Check:**
1. Server is running (`npm run dev` in terminal)
2. `.env` file exists in `server/` folder
3. `MONGO_URI` is set correctly
4. MongoDB connection test passes: `node seed/testMongoDB.js`
5. Look at server terminal for error messages

### Account Created but Can't Login

**Try:**
```bash
cd server
node seed/fixPasswordHashing.js
```

### Can't Connect to MongoDB

**Verify:**
- ✅ IP is whitelisted in MongoDB Atlas (Network Access)
- ✅ Username/password are correct
- ✅ Connection string has correct cluster name
- ✅ `.env` has `MONGO_URI=` (not `MONGODB_URI=`)

### Still Having Issues?

1. Check **Server Terminal** logs for errors (should have detailed messages)
2. Run connection test: `node seed/testMongoDB.js`
3. Verify `.env` file exists and has values
4. Make sure MongoDB Atlas cluster is **active** (not paused)

---

## ✨ What Happens Behind the Scenes

1. You fill registration form
2. Frontend sends data to `/api/auth/register`
3. Backend receives data (logs show: `📝 [REGISTER] Attempting registration`)
4. Check if email exists in MongoDB
5. Create User document in MongoDB
6. Create Organization (if Company/Cabinet)
7. Generate JWT tokens
8. Return tokens + user info to frontend
9. Frontend saves tokens in localStorage
10. Redirect to dashboard
11. **New account now in MongoDB Atlas! ✅**

---

## 🎓 Key Points

✅ **MONGO_URI** must be in `.env` file  
✅ **Credentials** must be correct (username:password)  
✅ **Your IP** must be whitelisted in Atlas  
✅ **Database name** is `omniai`  
✅ **Collections** will be auto-created on first registration  
✅ All registration data is **automatically saved**  

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| No account in DB | Check MONGO_URI in .env |
| Connection timeout | Whitelist IP in MongoDB Atlas |
| Auth failed | Verify username/password |
| Registration page broken | Restart backend server |
| Can't create account | Run `node seed/testMongoDB.js` |
| Old accounts won't login | Run `node seed/fixPasswordHashing.js` |

---

## ✅ Summary

**Your accounts WILL be saved automatically to MongoDB when:**
1. ✅ `.env` file exists with MONGO_URI
2. ✅ MongoDB connection works (verified by test)
3. ✅ Server is running (`npm run dev`)
4. ✅ Registration form is submitted

**Then everything is automatic! 🎉**

---

EOF - Follow these 3 steps and registration will work perfectly!
