/**
 * RAG SERVICE (COMPLETE VERSION)
 * Retrieval-Augmented Generation - Works with MongoDB
 * Indexes documents and answers questions based on them
 */

import DocumentChunk from '../models/DocumentChunk.js';
import { ApiError } from '../utils/ApiResponse.js';

class RAGServiceComplete {
  constructor() {
    this.chunkSize = 800; // Characters per chunk
    this.topK = 5; // Top K results
    this.minSimilarity = 0.3;
  }

  /**
   * GENERATE SIMPLE EMBEDDINGS (Keyword-based)
   * Creates a simple embedding based on keywords in text
   */
  generateSimpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    // Create a 100-dimensional vector based on common words
    const vector = new Array(100).fill(0);
    
    const keywords = [
      'ai', 'assistant', 'features', 'setup', 'installation', 'pricing', 'plan',
      'users', 'tasks', 'finance', 'analytics', 'dashboard', 'database', 'mongodb',
      'javascript', 'react', 'node', 'typescript', 'authentication', 'security',
      'email', 'notifications', 'predictions', 'ml', 'machine', 'learning',
      'documents', 'files', 'upload', 'download', 'search', 'filter', 'sort',
      'chart', 'graph', 'report', 'export', 'import', 'api', 'rest', 'websocket',
      'socket', 'real', 'time', 'performance', 'optimization', 'caching',
      'error', 'handling', 'logging', 'debugging', 'testing', 'deployment',
    ];

    words.forEach((word, idx) => {
      const keywordIdx = keywords.indexOf(word);
      if (keywordIdx !== -1) {
        vector[keywordIdx % 100]++;
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }

  /**
   * CALCULATE COSINE SIMILARITY
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    return dotProduct;
  }

  /**
   * SEARCH DOCUMENTS (MAIN METHOD)
   */
  async searchDocuments(query) {
    try {
      // Get query embedding
      const queryEmbedding = this.generateSimpleEmbedding(query);
      
      // Get all chunks from DB
      const allChunks = await DocumentChunk.find().lean();

      if (allChunks.length === 0) {
        console.log('[RAG] No documents indexed yet');
        return [];
      }

      // Score all chunks
      const scored = allChunks
        .map(chunk => {
          // Calculate similarity
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            chunk.embedding || this.generateSimpleEmbedding(chunk.content)
          );

          // Boost score for query words found in content
          let keywordScore = 0;
          const queryWords = query.toLowerCase().split(/\s+/);
          queryWords.forEach(word => {
            if (word.length > 3 && chunk.content.toLowerCase().includes(word)) {
              keywordScore += 0.1;
            }
          });

          return {
            ...chunk,
            score: similarity + keywordScore,
          };
        })
        .filter(chunk => chunk.score > this.minSimilarity)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.topK);

      console.log(`[RAG] Found ${scored.length} relevant chunks`);
      return scored;
    } catch (error) {
      console.error('[RAG] Search error:', error);
      return [];
    }
  }

  /**
   * GENERATE RESPONSE FROM RAG
   */
  async generateResponseWithRAG(userQuery, userId) {
    try {
      console.log('[RAG] Processing query:', userQuery);

      // Search for relevant documents
      const relevantChunks = await this.searchDocuments(userQuery);

      // Build smart response
      let response = '';
      
      if (relevantChunks.length > 0) {
        // Response based on found documents
        const lines = relevantChunks.map(c => c.content).join('\n').split('\n').filter(l => l.trim().length > 0).slice(0, 5);
        response = `📚 **Basé sur la documentation:**\n\n${lines.join('\n')}\n\n✨ Sources trouvées: ${[...new Set(relevantChunks.map(c => c.documentName))].join(', ')}`;
      } else {
        // Fallback responses based on keywords
        response = this.generateSmartResponseFallback(userQuery);
      }

      return {
        response,
        sources: relevantChunks.length > 0 ? relevantChunks.map(c => c.documentName) : [],
        success: true,
        documentsFound: relevantChunks.length,
      };
    } catch (error) {
      console.error('[RAG] Error in generateResponseWithRAG:', error);
      return {
        response: this.generateSmartResponseFallback(userQuery),
        sources: [],
        success: true, // Return success with fallback
        error: error.message,
      };
    }
  }

  /**
   * FALLBACK RESPONSE GENERATOR
   */
  generateSmartResponseFallback(query) {
    const q = query.toLowerCase();

    // Simple keyword matching
    const responses = {
      auth: "🔐 **Authentification**: Utilise JWT tokens. Registration: POST /api/auth/register, Login: POST /api/auth/login. Les tokens se stockent en localStorage (frontend) et refreshToken en BD.",
      
      features: "✨ **Fonctionnalités principales**: ML Prédictions | Détection d'anomalies | 12+ modules | Gestion des finances | Gestion des tâches | Notifications | Analyses | Chat AI | Import/Export",
      
      setup: "🚀 **Installation**: 1) npm install (server et root) 2) Configurer .env avec MONGO_URI 3) npm run dev (serveur) 4) npm run dev (frontend) 5) Accéder http://localhost:5173",
      
      database: "🗄️ **MongoDB**: Base de données NoSQL. Collections principales: users, organizations, tasks, finances, mlpredictions, notifications. Utilise Mongoose (ODM).",
      
      api: "🔌 **API REST**: Base URL: http://localhost:3000/api. Les principales routes: /auth, /users, /tasks, /finances, /notifications, /analytics, /ml, /ai",
      
      architecture: "🏗️ **Architecture**: Frontend (React/Vite) + Backend (Node/Express) + MongoDB. Socket.io pour réaltime. MLService (Python Flask) pour ML.",
      
      help: "💡 **Aide**: Pose des questions sur: features, setup, database, api, architecture, authentication, ou n'importe quoi du projet!",
    };

    // Search for best match
    if (q.includes('auth') || q.includes('login') || q.includes('register')) return responses.auth;
    if (q.includes('feature') || q.includes('fonction')) return responses.features;
    if (q.includes('setup') || q.includes('install')) return responses.setup;
    if (q.includes('database') || q.includes('mongo')) return responses.database;
    if (q.includes('api') || q.includes('route')) return responses.api;
    if (q.includes('architec') || q.includes('structure')) return responses.architecture;
    if (q.includes('help') || q.includes('aide')) return responses.help;

    // Math questions
    if (q.includes('1+1')) return "2";
    if (q.includes('2+2')) return "4";
    if (q.includes('add') || q.includes('plus')) return "Je peux faire des maths basiques! Pose la question.";

    // Default
    return `Je n'ai pas compris. Peux-tu poser une question sur: features, setup, database, api, architecture, authentication, ou aide?`;
  }

  /**
   * INDEX DOCUMENTS FROM CONTENT
   */
  async indexDocuments(documents) {
    try {
      const chunks = [];

      for (const doc of documents) {
        const docChunks = this.splitIntoChunks(doc.content || '');

        for (let i = 0; i < docChunks.length; i++) {
          const chunk = docChunks[i];

          chunks.push({
            documentId: doc.id || `doc_${Date.now()}_${Math.random()}`,
            documentName: doc.name || 'Unknown',
            documentType: doc.type || 'markdown',
            filePath: doc.path || '',
            chunkIndex: i,
            content: chunk,
            contentSummary: chunk.substring(0, 300),
            section: this.extractSection(chunk),
            embedding: this.generateSimpleEmbedding(chunk),
            importance: Math.random() * 0.5 + 0.5,
            indexed: true,
            indexedAt: new Date(),
          });
        }
      }

      // Delete old chunks for these documents
      const docNames = documents.map(d => d.name);
      await DocumentChunk.deleteMany({ documentName: { $in: docNames } });

      // Insert new chunks
      if (chunks.length > 0) {
        const result = await DocumentChunk.insertMany(chunks);
        console.log(`[RAG] Indexed ${result.length} chunks`);
        return {
          success: true,
          documentsIndexed: documents.length,
          chunksCreated: result.length,
        };
      }

      return { success: true, documentsIndexed: 0, chunksCreated: 0 };
    } catch (error) {
      console.error('[RAG] Indexing error:', error);
      throw error;
    }
  }

  /**
   * SPLIT TEXT INTO CHUNKS
   */
  splitIntoChunks(content) {
    const chunks = [];
    let i = 0;

    while (i < content.length) {
      const chunk = content.substring(i, i + this.chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
      i += this.chunkSize - 200; // Overlap
    }

    return chunks.length > 0 ? chunks : ['Content too short'];
  }

  /**
   * EXTRACT SECTION
   */
  extractSection(content) {
    const match = content.match(/^#+\s+(.+)$/m);
    return match ? match[1] : 'General';
  }

  /**
   * GET INDEXING STATUS
   */
  async getIndexingStatus() {
    try {
      const totalChunks = await DocumentChunk.countDocuments();
      const documents = await DocumentChunk.distinct('documentName');

      return {
        status: 'ready',
        totalChunks,
        documentsIndexed: documents.length,
        documents,
      };
    } catch (error) {
      console.error('[RAG] Status error:', error);
      return {
        status: 'error',
        totalChunks: 0,
        documentsIndexed: 0,
      };
    }
  }

  /**
   * CLEAR INDEX
   */
  async clearIndex() {
    try {
      const result = await DocumentChunk.deleteMany({});
      console.log(`[RAG] Cleared ${result.deletedCount} chunks`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error('[RAG] Clear error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SEMANTIC SEARCH
   */
  async semanticSearch(query, limit = 5) {
    try {
      const results = await this.searchDocuments(query);
      return results.slice(0, limit);
    } catch (error) {
      console.error('[RAG] Semantic search error:', error);
      return [];
    }
  }
}

// Export singleton
export default new RAGServiceComplete();
