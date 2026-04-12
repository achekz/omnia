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

      if (relevantChunks.length === 0) {
        return {
          response: `Je n'ai pas trouvé d'informations sur "${userQuery}". Peux-tu être plus spécifique ou questionner sur: features, setup, pricing, architecture, ou fonctionnalités?`,
          sources: [],
          success: false,
          documentsFound: 0,
        };
      }

      // Build response from chunks
      const sources = [...new Set(relevantChunks.map(c => c.documentName))];
      const context = relevantChunks.map(c => c.content).join('\n\n');

      // Generate a smart response
      const response = this.generateSmartResponse(userQuery, relevantChunks, context);

      return {
        response,
        sources: sources.map(name => ({
          name,
          chunks: relevantChunks.filter(c => c.documentName === name).length,
        })),
        success: true,
        documentsFound: relevantChunks.length,
        context: context.substring(0, 1000), // First 1000 chars of context
      };
    } catch (error) {
      console.error('[RAG] Error in generateResponseWithRAG:', error);
      throw error;
    }
  }

  /**
   * GENERATE SMART RESPONSE
   */
  generateSmartResponse(query, chunks, context) {
    const queryLower = query.toLowerCase();

    // Extract key info from context
    const lines = context.split('\n').filter(l => l.trim().length > 0);
    const relevantLines = lines.slice(0, 5); // Top 5 lines

    // Build response based on query type
    if (queryLower.includes('feature') || queryLower.includes('fonction')) {
      return `📋 **Fonctionnalités d'Omni AI:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    if (queryLower.includes('setup') || queryLower.includes('install')) {
      return `🚀 **Installation et Setup:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    if (queryLower.includes('price') || queryLower.includes('prix')) {
      return `💰 **Pricing et Plans:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    if (queryLower.includes('architec') || queryLower.includes('structure')) {
      return `🏗️ **Architecture du Projet:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    if (queryLower.includes('database') || queryLower.includes('mongo')) {
      return `🗄️ **Base de Données:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    if (queryLower.includes('api') || queryLower.includes('endpoint')) {
      return `🔌 **API et Routes:**\n\n${relevantLines.join('\n')}\n\n💡 **Sources:** ${chunks.map(c => c.documentName).join(', ')}`;
    }

    // Default response
    return `📚 **Basé sur la documentation:**\n\n${relevantLines.join('\n')}\n\n---\n\n💡 **Sources trouvées:** ${chunks.map(c => c.documentName).join(', ')}\n\n✨ Pour plus de détails, consulte les documents sources!`;
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
