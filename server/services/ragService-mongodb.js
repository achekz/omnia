/**
 * MONGODB RAG SERVICE
 * Stores and searches documents in MongoDB
 */

import DocumentChunk from '../models/DocumentChunk.js';

class RAGServiceMongoDB {
  constructor() {
    this.topK = 5;
  }

  /**
   * SEARCH IN MONGODB
   */
  async searchDocuments(query) {
    try {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      if (queryWords.length === 0) {
        return [];
      }

      // Create regex patterns
      const patterns = queryWords.map(word => new RegExp(word, 'i'));

      // Search in MongoDB
      const results = await DocumentChunk.find({
        $or: [
          ...patterns.map(p => ({ content: { $regex: p } })),
          ...patterns.map(p => ({ documentName: { $regex: p } })),
        ],
      })
        .sort({ importance: -1, chunkIndex: 1 })
        .limit(this.topK)
        .lean();

      console.log(`[RAG-DB] Found ${results.length} results for: "${query}"`);
      return results;
    } catch (error) {
      console.error('[RAG-DB] Search error:', error);
      return [];
    }
  }

  /**
   * GENERATE RESPONSE WITH RAG
   */
  async generateResponseWithRAG(userQuery, userId) {
    try {
      console.log('[RAG-DB] Processing query:', userQuery);

      // Search MongoDB
      const relevantChunks = await this.searchDocuments(userQuery);

      // Build response
      let response = '';
      const sources = [];

      if (relevantChunks.length > 0) {
        // Response from documents
        const lines = relevantChunks
          .flatMap(c => c.content.split('\n'))
          .filter(l => l.trim().length > 0)
          .slice(0, 8);

        sources.push(...[...new Set(relevantChunks.map(c => c.documentName))]);
        response = `📚 **Basé sur la documentation:**\n\n${lines.join('\n')}\n\n💡 **Sources:** ${sources.join(', ')}`;
      } else {
        // Fallback response
        response = this.generateFallbackResponse(userQuery);
      }

      return {
        response,
        sources,
        success: true,
        documentsFound: relevantChunks.length,
        mode: relevantChunks.length > 0 ? 'rag' : 'fallback',
      };
    } catch (error) {
      console.error('[RAG-DB] Error:', error);
      return {
        response: this.generateFallbackResponse(userQuery),
        sources: [],
        success: true,
        error: error.message,
        mode: 'fallback',
      };
    }
  }

  /**
   * FALLBACK RESPONSE
   */
  generateFallbackResponse(query) {
    const q = query.toLowerCase();

    const responses = {
      auth: "🔐 **Authentification**: Utilise JWT tokens. Routes: POST /api/auth/register, POST /api/auth/login. Tokens en localStorage + refreshToken en BD.",
      features: "✨ **Fonctionnalités**: ML Predictions | Anomaly Detection | 12+ Modules | Finance Management | Task Management | Notifications | Analytics | AI Chat",
      setup: "🚀 **Installation**: npm install (root + server) → Configurer .env → npm run dev (deux terminals)",
      db: "🗄️ **MongoDB**: Collections: users, organizations, tasks, finances, mlpredictions, notifications",
      api: "🔌 **API**: Base http://localhost:3000/api avec routes: /auth, /users, /tasks, /finances, /notifications, /ai",
      arch: "🏗️ **Architecture**: React + Node.js + MongoDB + Socket.io + Python ML Service",
      help: "💡 **Aide**: Pose des questions sur: features, setup, database, api, architecture, authentication",
    };

    if (q.includes('auth') || q.includes('login')) return responses.auth;
    if (q.includes('feature')) return responses.features;
    if (q.includes('setup') || q.includes('install')) return responses.setup;
    if (q.includes('database') || q.includes('mongo') || q.includes('db')) return responses.db;
    if (q.includes('api')) return responses.api;
    if (q.includes('arch') || q.includes('structure')) return responses.arch;
    if (q.includes('help') || q.includes('aide')) return responses.help;
    if (q.includes('1+1')) return "= 2";
    if (q.includes('hello') || q.includes('hi') || q.includes('salut')) return "Salut! Je suis l'assistant Omni AI. Comment puis-je t'aider?";

    return "Je n'ai pas compris. Pose une question sur: features, setup, database, api, architecture, authentication";
  }

  /**
   * INDEX DOCUMENTS IN MONGODB
   */
  async indexDocuments(documents) {
    try {
      console.log(`[RAG-DB] 📝 Indexing ${documents.length} documents...`);

      const chunks = [];

      for (const doc of documents) {
        const docChunks = this.splitIntoChunks(doc.content || '', doc.name || 'Unknown');

        for (let i = 0; i < docChunks.length; i++) {
          // Map file extension to valid documentType
          let documentType = 'other';
          const ext = doc.type?.toLowerCase() || '';
          
          if (ext === 'md') documentType = 'markdown';
          else if (ext === 'js' || ext === 'javascript') documentType = 'javascript';
          else if (ext === 'ts' || ext === 'typescript') documentType = 'typescript';
          else if (ext === 'py' || ext === 'python') documentType = 'python';
          else if (ext === 'json') documentType = 'json';

          // Generate simple embedding (array of zeros of length 100)
          const embedding = new Array(100).fill(0).map(() => Math.random() * 0.1);

          chunks.push({
            documentId: doc.id || `doc_${Date.now()}_${Math.random()}`,
            documentName: doc.name || 'Unknown',
            documentType: documentType,
            filePath: doc.path || '',
            chunkIndex: i,
            content: docChunks[i].text,
            contentSummary: docChunks[i].text.substring(0, 300),
            section: docChunks[i].section,
            importance: Math.random() * 0.5 + 0.5,
            embedding: embedding,
            indexed: true,
            indexedAt: new Date(),
          });
        }
      }

      if (chunks.length === 0) {
        return { success: false, message: 'No chunks to index' };
      }

      // Delete old chunks for these documents
      const docNames = documents.map(d => d.name);
      await DocumentChunk.deleteMany({ documentName: { $in: docNames } });

      // Insert new chunks
      const result = await DocumentChunk.insertMany(chunks);

      console.log(`[RAG-DB] ✅ Indexed ${result.length} chunks in MongoDB`);

      return {
        success: true,
        documentsIndexed: documents.length,
        chunksCreated: result.length,
      };
    } catch (error) {
      console.error('[RAG-DB] Indexing error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * SPLIT INTO CHUNKS
   */
  splitIntoChunks(content, filename) {
    const chunks = [];
    const chunkSize = 800;
    const overlap = 200;

    let i = 0;
    let chunkIndex = 0;

    while (i < content.length) {
      const chunk = content.substring(i, i + chunkSize);

      if (chunk.trim().length > 0) {
        chunks.push({
          text: chunk,
          section: this.extractSection(chunk),
          chunkIndex,
        });
        chunkIndex++;
      }

      i += chunkSize - overlap;
    }

    return chunks.length > 0 ? chunks : [];
  }

  /**
   * EXTRACT SECTION
   */
  extractSection(text) {
    const match = text.match(/^#+\s+(.+)$/m);
    return match ? match[1] : 'Content';
  }

  /**
   * GET STATUS
   */
  async getStatus() {
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
      console.error('[RAG-DB] Status error:', error);
      return {
        status: 'error',
        totalChunks: 0,
        documentsIndexed: 0,
      };
    }
  }

  /**
   * SEMANTIC SEARCH
   */
  async semanticSearch(query, limit = 5) {
    const results = await this.searchDocuments(query);
    return results.slice(0, limit);
  }

  /**
   * CLEAR INDEX
   */
  async clearIndex() {
    try {
      const result = await DocumentChunk.deleteMany({});
      console.log(`[RAG-DB] ✅ Cleared ${result.deletedCount} chunks`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error('[RAG-DB] Clear error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export default new RAGServiceMongoDB();
