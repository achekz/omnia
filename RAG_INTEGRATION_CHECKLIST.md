/**
 * RAG AI ASSISTANT - INTEGRATION CHECKLIST
 * Complete checklist to integrate RAG into your project
 */

## ✅ INSTALLATION CHECKLIST

### 1️⃣ Install Dependencies
```bash
npm install \
  @huggingface/inference \
  axios \
  anthropic
```

**Versions:**
- `@huggingface/inference`: ^2.6.4
- `axios`: ^1.6.0+
- `anthropic`: ^0.20.0+

### 2️⃣ Environment Variables
Add to `.env`:
```
# Hugging Face API Key
# Get from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx

# Anthropic Claude API Key
# Get from: https://console.anthropic.com/
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx

# MongoDB Vector Search (optional)
MONGODB_VECTOR_SEARCH_ENABLED=true

# Project root for document loading
PROJECT_ROOT=./
```

### 3️⃣ Update server.js
Add these imports:
```javascript
import aiAssistantRoutes from './routes/aiAssistant.routes.js';
import documentLoader from './services/documentLoader.js';
```

Mount the routes:
```javascript
// Before app.listen()
app.use('/api/ai', aiAssistantRoutes);

// Initialize document indexing
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    console.log('📚 Indexing documents for RAG...');
    const result = await documentLoader.loadAndIndex();
    console.log('✅ Documents indexed:', result.chunksCreated, 'chunks');
  } catch (error) {
    console.warn('⚠️ Document indexing failed:', error.message);
  }
});
```

### 4️⃣ Create HTTP Request to Test

**Test Chat Endpoint:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "Comment implémenter le caching avec Redis?"
  }'
```

**Test Search Endpoint:**
```bash
curl -X POST http://localhost:3000/api/ai/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "rate limiting",
    "limit": 5
  }'
```

**Check Status:**
```bash
curl http://localhost:3000/api/ai/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5️⃣ Frontend Integration

Create `src/components/AIAssistant.tsx`:
```typescript
import { useState } from 'react';
import axios from 'axios';

export function AIAssistant() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/ai/chat', { query });
      
      if (res.data.data.success) {
        setResponse(res.data.data.response);
        setSources(res.data.data.sources || []);
      } else {
        setError(res.data.data.message || 'No response');
      }
      
      setQuery('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error sending query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant space-y-4 p-4">
      <h2 className="text-2xl font-bold">AI Assistant</h2>
      
      <form onSubmit={handleChat} className="space-y-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about the project..."
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded">
            <p className="font-semibold mb-2">Response:</p>
            <p>{response}</p>
          </div>

          {sources.length > 0 && (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <p className="font-semibold mb-2">Sources:</p>
              <ul className="list-disc list-inside space-y-1">
                {sources.map((source, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{source.name}</span>
                    {source.section && ` - ${source.section}`}
                    <span className="ml-2 text-gray-500">
                      ({(source.relevance * 100).toFixed(0)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6️⃣ Features Overview

**Available endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/chat` | Chat with AI (RAG-enhanced) |
| POST | `/api/ai/search` | Semantic search |
| POST | `/api/ai/suggestions` | Get AI suggestions |
| POST | `/api/ai/advanced-search` | Search with filters |
| POST | `/api/ai/context` | Get context for query |
| GET | `/api/ai/status` | Get indexing status |
| POST | `/api/ai/index` | Index documents (admin) |
| POST | `/api/ai/reload` | Reload documents (admin) |

### 7️⃣ Troubleshooting

**Problem: API returns 401**
- Solution: Check Authorization header has valid JWT token

**Problem: "No documents indexed"**
- Solution: Run POST `/api/ai/index` endpoint (admin only)

**Problem: Slow responses**
- Solution: 
  - Reduce `topK` parameter in ragService.js
  - Use smaller embedding model
  - Enable Redis caching

**Problem: "Failed to generate embeddings"**
- Solution: Verify HUGGINGFACE_API_KEY is correct and has sufficient quota

**Problem: Vector search not working**
- Solution: MongoDB 6.0+ required for Atlas Vector Search
  - Fallback to text search is automatic

### 8️⃣ Performance Optimization

**Caching Responses:**
```javascript
// In ragService.js
async generateResponseWithRAG(userQuery, userId) {
  // Check cache first
  const cached = await getCache(`ai:${userQuery}`);
  if (cached) return cached;
  
  // Generate response...
  const result = { ... };
  
  // Cache for 1 hour
  await setCache(`ai:${userQuery}`, result, 3600);
  
  return result;
}
```

**Pagination for Search:**
```bash
curl -X POST http://localhost:3000/api/ai/search \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "query": "authentication",
    "limit": 10,
    "offset": 20
  }'
```

### 9️⃣ Monitoring & Debugging

**Check indexing status:**
```bash
curl http://localhost:3000/api/ai/status
```

**Response:**
```json
{
  "totalChunks": 1234,
  "byType": [
    { "_id": "markdown", "count": 500, "avgImportance": 0.7 },
    { "_id": "javascript", "count": 734, "avgImportance": 0.6 }
  ],
  "lastUpdated": "2024-04-11T10:30:00Z"
}
```

**Enable logging:**
```javascript
// In ragService.js
const DEBUG = process.env.DEBUG_RAG === 'true';

if (DEBUG) {
  console.log('Query:', userQuery);
  console.log('Found documents:', relevantDocs.length);
  console.log('LLM Request:', systemPrompt);
}
```

### 🔟 Security Considerations

1. **API Key Protection:**
   - Never commit `.env` to git
   - Use environment-based API keys
   - Rotate keys periodically

2. **Rate Limiting:**
   - Already implemented via `rateLimiter.js`
   - Default: 20 requests/day per user for ML endpoints

3. **Access Control:**
   - `/api/ai/index` and `/api/ai/reload` require admin role
   - All other endpoints protected by `protect` middleware

4. **Data Privacy:**
   - Document chunks stored in MongoDB
   - No PII in indexed documents
   - User queries not logged by default

### Summary

✅ **All 8 files created:**
1. `DocumentChunk.js` - MongoDB schema
2. `ragService.js` - Core RAG logic
3. `documentLoader.js` - Document indexing
4. `aiAssistantController.js` - API controllers
5. `aiAssistant.routes.js` - Express routes
6. `AIAssistant.tsx` - React component
7. `RAG_SETUP_GUIDE.md` - Setup guide
8. `RAG_INTEGRATION_CHECKLIST.md` - This file

✅ **Ready to use:**
- 8 API endpoints
- Semantic search with embeddings
- Document indexing
- Claude LLM integration
- React component

✅ **Features:**
- 🔍 Semantic search with Hugging Face
- 🤖 Claude AI responses with RAG
- 💾 MongoDB vector storage
- 🚀 Production-ready error handling
- 🔐 Authentication & authorization
- 📊 Status monitoring

**Next step:** Install dependencies and add routes to server.js!
