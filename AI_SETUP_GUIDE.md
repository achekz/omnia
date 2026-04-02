# Real AI Assistant Setup Guide

## ✅ Changes Made

### 1. **ai.service.js** (Node.js - COMPLETELY REFACTORED)
**Before:** Had static fallback responses for keywords like "tâche", "vente", etc.
**After:** Now ONLY calls OpenAI API - removes all hardcoded responses

Key improvements:
- ❌ Removed `generateFallbackResponse()` function (was returning static text)
- ❌ Removed `buildPrompt()` import (simplified)
- ✅ Added direct OpenAI API calls
- ✅ Better error handling that throws (doesn't hide errors)
- ✅ Structured prompts with user context
- ✅ Full support for real ChatGPT-like responses

### 2. **promptBuilder.js** (Node.js)
**For backward compatibility** (not actively used in new pipeline)
- Cleaned up French text
- Made context extraction more robust
- Added support for more role types

### 3. **ml_service/routes/ai.py** (Flask - NEW FILE)
**Brand new real AI endpoint** for Python backend

Model: `gpt-4-turbo-preview`
Endpoint: `POST /ai`
```
Request:
{
  "prompt": "User question",
  "user_role": "employee|company_admin|cabinet_admin|student",
  "context": { ... data ... }
}

Response:
{
  "response": "Real AI answer here",
  "status": "success",
  "model": "gpt-4-turbo-preview",
  "tokens_used": 45
}
```

### 4. **app.py** (Flask - UPDATED)
- Registered new `/ai` blueprint
- Now exposes real AI endpoint at `http://localhost:5001/ai`

### 5. **requirements.txt** (Python - UPDATED)
- Added `openai>=1.0.0` package

---

## 🚀 SETUP INSTRUCTIONS

### Step 1: Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy the key (starts with `sk-`)

### Step 2: Set Environment Variables

**On Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY = "sk-your-actual-key-here"
$env:OPENAI_MODEL = "gpt-4-turbo-preview"
```

**On Linux/Mac:**
```bash
export OPENAI_API_KEY="sk-your-actual-key-here"
export OPENAI_MODEL="gpt-4-turbo-preview"
```

**In .env file:**
```
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

### Step 3: Install Python Dependencies
```bash
cd ml_service
pip install -r requirements.txt
```

### Step 4: Install Node.js Dependencies
```bash
cd server
npm install
```

### Step 5: Start Services

**Terminal 1 - Flask AI Service:**
```bash
cd ml_service
python app.py
# Should print: 🚀 ML Service starting on port 5001...
```

**Terminal 2 - Node.js Backend:**
```bash
cd server
npm run dev
# Should print: Server running on port 5000
```

---

## 🧪 TEST IT

### Test 1: Simple Math
```bash
curl -X POST http://localhost:5000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 1+1?"}'
```

**Expected Response:**
```json
{
  "response": "1 + 1 = 2"
}
```

### Test 2: Greeting
```bash
curl -X POST http://localhost:5000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "hi"}'
```

**Expected Response:**
```json
{
  "response": "Hello! How can I help you today? Feel free to ask me anything."
}
```

### Test 3: Question with Context (Authenticated)
```bash
curl -X POST http://localhost:5000/api/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "What should I do today?",
    "context": {
      "tasks": [
        {"title": "Finish report", "priority": "high"},
        {"title": "Email client", "priority": "medium"}
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "response": "Based on your tasks, I recommend starting with finishing the report since it's high priority. After that, send that email to your client. You have a good mix of important tasks today!"
}
```

### Test 4: Python Flask Direct Call
```bash
curl -X POST http://localhost:5001/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate 15 * 7",
    "user_role": "employee",
    "context": {}
  }'
```

**Expected Response:**
```json
{
  "response": "15 × 7 = 105",
  "status": "success",
  "model": "gpt-4-turbo-preview",
  "tokens_used": 28
}
```

---

## ❌ TROUBLESHOOTING

### Error: "OPENAI_API_KEY not configured"
**Solution:** Check environment variables were set correctly
```powershell
# PowerShell
echo $env:OPENAI_API_KEY  # Should show your key

# Linux/Mac
echo $OPENAI_API_KEY
```

### Error: "Cannot find module 'openai'"
**Solution:** Install Python package
```bash
cd ml_service
pip install openai>=1.0.0
```

### Error: "Model not found"
**Solution:** Check you're using valid model names:
- `gpt-4-turbo-preview` (recommended)
- `gpt-4`
- `gpt-3.5-turbo`

Ensure your API key has access to GPT-4.

### Response is still static/hardcoded
**Solution:** 
1. Check ai.service.js doesn't call old `buildPrompt()` (it shouldn't)
2. Verify OPENAI_API_KEY is set
3. Check server logs for actual error message
4. Look for "❌ AI Error" in console

---

## 📊 How It Works Now

```
User Question
    ↓
Node.js /api/ai/ask endpoint
    ↓
ai.service.js:askAI()
    ├─ Get ML context (risk score, recommendations)
    ├─ Build system prompt (role-based)
    ├─ Build user prompt (with context)
    ├─ Check OPENAI_API_KEY exists
    └─ Call OpenAI API ← REAL INTELLIGENCE
        ↓
    OpenAI Returns Smart Response
        ↓
    Return to Frontend
        ↓
User sees intelligent answer (like ChatGPT)
```

---

## 🎯 Key Differences

### BEFORE (Static):
```javascript
// Old code - WRONG
if (message.includes("1+1")) {
  return "1+1 = 2"; // Hardcoded
}
```

### AFTER (Real AI):
```javascript
// New code - CORRECT
const response = await callOpenAI(systemPrompt, userPrompt);
return response; // Real AI response
```

---

## 🔐 Important Notes

1. **Cost:** OpenAI API calls cost money. Monitor your usage.
2. **Rate Limits:** OpenAI has rate limits. Implement retry logic for production.
3. **Security:** Never commit API keys. Use environment variables.
4. **Models:** Ensure API key has access to gpt-4. GPT-3.5-turbo is cheaper but less capable.

---

## 📝 Frontend Example

```javascript
// React example
async function askAI(message) {
  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  
  const data = await response.json();
  return data.response; // Real AI response!
}

// Usage
const answer = await askAI("What is 1+1?");
console.log(answer); // Outputs: "1 + 1 = 2"
```

---

## ✨ Summary

Your AI assistant is now **truly intelligent**:
- ✅ Dynamic responses (not hardcoded)
- ✅ Understands context
- ✅ Performs math correctly
- ✅ Has conversations like ChatGPT
- ✅ Role-aware (employee, admin, student, etc.)
- ✅ Integrates with your ML backend

**No more static responses!** 🎉
