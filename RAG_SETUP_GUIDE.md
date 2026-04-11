/**
 * RAG AI ASSISTANT SETUP GUIDE
 * Complete setup instructions for the RAG-powered AI assistant
 */

/**
 * STEP 1: INSTALL DEPENDENCIES
 * 
 * Run this command to install all required packages:
 * 
 * npm install \
 *   @huggingface/inference \
 *   axios \
 *   anthropic
 * 
 * OR with yarn:
 * yarn add @huggingface/inference axios anthropic
 */

/**
 * STEP 2: ENVIRONMENT VARIABLES
 * 
 * Add these to your .env file:
 * 
 * # Hugging Face API (for embeddings)
 * HUGGINGFACE_API_KEY=hf_your_api_key_here
 * 
 * # Anthropic Claude API (for LLM)
 * CLAUDE_API_KEY=sk-ant-your_api_key_here
 * 
 * # MongoDB Atlas Vector Search (optional, for advanced features)
 * MONGODB_VECTOR_SEARCH_ENABLED=true
 * 
 * # Project root for document loading
 * PROJECT_ROOT=./
 */

/**
 * STEP 3: INTEGRATE WITH SERVER.JS
 * 
 * Add to server.js:
 * 
 * import aiAssistantRoutes from './routes/aiAssistant.routes.js';
 * import documentLoader from './services/documentLoader.js';
 * 
 * // Mount AI assistant routes
 * app.use('/api/ai', aiAssistantRoutes);
 * 
 * // Initialize document indexing on server start
 * app.listen(PORT, async () => {
 *   console.log(`Server running on port ${PORT}`);
 *   
 *   // Load and index documents
 *   try {
 *     console.log('📚 Indexing documents for RAG...');
 *     const result = await documentLoader.loadAndIndex();
 *     console.log('✅ Documents indexed:', result.chunksCreated, 'chunks');
 *   } catch (error) {
 *     console.error('⚠️ Failed to index documents:', error.message);
 *     // Non-critical, continue server startup
 *   }
 * });
 */

/**
 * STEP 4: API ENDPOINTS
 * 
 * Now available endpoints:
 * 
 * 1. POST /api/ai/chat
 *    Chat with AI assistant
 *    Body: { query: "Your question here" }
 * 
 * 2. POST /api/ai/search
 *    Semantic search
 *    Body: { query: "search terms", limit: 5 }
 * 
 * 3. POST /api/ai/suggestions
 *    Get AI suggestions
 *    Body: { query: "topic" }
 * 
 * 4. POST /api/ai/advanced-search
 *    Advanced search with filters
 *    Body: {
 *      query: "search",
 *      documentType: "javascript",
 *      section: "Authentication",
 *      limit: 10
 *    }
 * 
 * 5. POST /api/ai/context
 *    Get context for query
 *    Body: { query: "topic" }
 * 
 * 6. GET /api/ai/status
 *    Get indexing status
 * 
 * 7. POST /api/ai/index (Admin only)
 *    Manually trigger document indexing
 * 
 * 8. POST /api/ai/reload (Admin only)
 *    Reload documents
 */

/**
 * STEP 5: USAGE EXAMPLES
 * 
 * Example 1: Chat with AI
 * 
 * const response = await fetch('/api/ai/chat', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer YOUR_TOKEN'
 *   },
 *   body: JSON.stringify({
 *     query: "Comment implémenter le caching avec Redis?"
 *   })
 * });
 * 
 * const data = await response.json();
 * console.log(data.data.response);     // AI response
 * console.log(data.data.sources);      // Source documents
 * 
 * ---
 * 
 * Example 2: Search documents
 * 
 * const searchResponse = await fetch('/api/ai/search', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer YOUR_TOKEN'
 *   },
 *   body: JSON.stringify({
 *     query: "rate limiting",
 *     limit: 5
 *   })
 * });
 * 
 * ---
 * 
 * Example 3: Advanced search with filters
 * 
 * const advancedResponse = await fetch('/api/ai/advanced-search', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer YOUR_TOKEN'
 *   },
 *   body: JSON.stringify({
 *     query: "authentication",
 *     documentType: "javascript",
 *     section: "Security",
 *     limit: 10,
 *     sortBy: "relevance"
 *   })
 * });
 */

/**
 * STEP 6: FRONTEND INTEGRATION
 * 
 * Create a React component for the AI assistant:
 * 
 * // src/components/AIAssistant.tsx
 * 
 * import { useState } from 'react';
 * import axios from 'axios';
 * 
 * export function AIAssistant() {
 *   const [query, setQuery] = useState('');
 *   const [response, setResponse] = useState('');
 *   const [sources, setSources] = useState([]);
 *   const [loading, setLoading] = useState(false);
 * 
 *   const handleChat = async () => {
 *     setLoading(true);
 *     try {
 *       const res = await axios.post('/api/ai/chat', { query });
 *       setResponse(res.data.data.response);
 *       setSources(res.data.data.sources);
 *     } catch (error) {
 *       console.error('Error:', error);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     <div className="ai-assistant">
 *       <input
 *         value={query}
 *         onChange={(e) => setQuery(e.target.value)}
 *         placeholder="Ask a question..."
 *       />
 *       <button onClick={handleChat} disabled={loading}>
 *         {loading ? 'Loading...' : 'Ask'}
 *       </button>
 * 
 *       {response && (
 *         <div className="response">
 *           <p>{response}</p>
 *           <div className="sources">
 *             {sources.map(s => (
 *               <a key={s.path}>{s.name}</a>
 *             ))}
 *           </div>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 */

/**
 * STEP 7: GETTING STARTED
 * 
 * 1. Install dependencies:
 *    npm install @huggingface/inference axios anthropic
 * 
 * 2. Get API keys:
 *    - Hugging Face: https://huggingface.co/settings/tokens
 *    - Claude: https://console.anthropic.com/
 * 
 * 3. Add environment variables to .env
 * 
 * 4. Add RAG routes to server.js
 * 
 * 5. Start server (documents will auto-index)
 * 
 * 6. Test API endpoint:
 *    curl -X POST http://localhost:3000/api/ai/chat \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -d '{"query": "What is RAG?"}'
 */

/**
 * STEP 8: TROUBLESHOOTING
 * 
 * Issue: "API key not found"
 * Solution: Make sure HUGGINGFACE_API_KEY and CLAUDE_API_KEY are in .env
 * 
 * Issue: "Failed to generate embeddings"
 * Solution: Check Hugging Face API is working and key is valid
 * 
 * Issue: "No documents indexed"
 * Solution: Run POST /api/ai/index endpoint manually (admin only)
 * 
 * Issue: "Slow response"
 * Solution: 
 *   - Reduce topK limit in RAG service
 *   - Use smaller embedding model
 *   - Add Redis caching for queries
 * 
 * Issue: "Vector search not working"
 * Solution: MongoDB Atlas Vector Search requires MongoDB 6.0+
 *           Fallback to text search is automatic
 */

/**
 * ARCHITECTURE OVERVIEW
 * 
 * Frontend (React)
 *     ↓
 * AI Assistant Routes (/api/ai/*)
 *     ↓
 * AI Assistant Controller
 *     ↓
 * RAG Service
 *     ├── Document Indexing
 *     ├── Embeddings (Hugging Face)
 *     ├── Vector Search (MongoDB)
 *     └── LLM Response (Claude)
 *     ↓
 * Document Chunks (MongoDB)
 */

/**
 * RAG FLOW
 * 
 * 1. User sends query
 * 2. Query is converted to embedding (Hugging Face)
 * 3. Semantic search in MongoDB finds similar documents
 * 4. Top-K documents are retrieved
 * 5. Documents are formatted as context
 * 6. Context + Query sent to Claude API
 * 7. Claude generates answer based on context
 * 8. Response + Sources returned to user
 */

/**
 * FILES CREATED
 * 
 * 1. server/models/DocumentChunk.js
 *    - MongoDB schema for storing document chunks with embeddings
 * 
 * 2. server/services/ragService.js
 *    - Core RAG service with embeddings, search, and LLM integration
 * 
 * 3. server/services/documentLoader.js
 *    - Loads documents from workspace and indexes them
 * 
 * 4. server/controllers/aiAssistantController.js
 *    - Controller with endpoints for chat, search, suggestions
 * 
 * 5. server/routes/aiAssistant.routes.js
 *    - Express routes for AI assistant
 */

export const RAG_SETUP = {
  dependencies: [
    '@huggingface/inference',
    'axios',
    'anthropic',
  ],
  envVariables: [
    'HUGGINGFACE_API_KEY',
    'CLAUDE_API_KEY',
    'MONGODB_VECTOR_SEARCH_ENABLED',
    'PROJECT_ROOT',
  ],
  endpoints: [
    'POST /api/ai/chat',
    'POST /api/ai/search',
    'POST /api/ai/suggestions',
    'POST /api/ai/advanced-search',
    'POST /api/ai/context',
    'GET /api/ai/status',
    'POST /api/ai/index',
    'POST /api/ai/reload',
  ],
};
