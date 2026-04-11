import axios from 'axios';
import DocumentChunk from '../models/DocumentChunk.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * RAG SERVICE (FIXED VERSION) - Retrieval-Augmented Generation
 * Works with standard MongoDB - no special vector search required
 * Fallback search chain: Text → Regex → Content Matching
 */

class RAGServiceFixed {
  constructor() {
    // Claude API for LLM
    this.claudeApiKey = process.env.CLAUDE_API_KEY || '';
    this.claudeModel = 'claude-3-sonnet-20240229';
    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
    
    // Search parameters
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
    this.topK = 5; // Top K similar documents to retrieve
    
    // Hugging Face (optional - for advanced embeddings)
    this.hfApiKey = process.env.HUGGINGFACE_API_KEY || null;
  }

  /**
   * SEARCH DOCUMENTS (MAIN METHOD)
   * Uses intelligent fallback chain:
   * 1. Full-text search (fastest, requires MongoDB text index)
   * 2. Regex search (medium, no index needed)
   * 3. Content similarity (slow, but always works)
   */
  async searchDocuments(query, limit = this.topK) {
    let results = [];

    // Try 1: Full-text Search (requires text index)
    console.log(`[RAG] Searching for: "${query}"`);
    results = await this.textSearch(query, limit);
    
    if (results.length > 0) {
      console.log(`[RAG] ✅ Text search found ${results.length} results`);
      return results;
    }

    // Try 2: Regex Search (no index needed)
    console.log('[RAG] Text search empty, trying regex...');
    results = await this.regexSearch(query, limit);
    
    if (results.length > 0) {
      console.log(`[RAG] ✅ Regex search found ${results.length} results`);
      return results;
    }

    // Try 3: Content Similarity (keyword matching)
    console.log('[RAG] Regex search empty, trying keyword matching...');
    results = await this.keywordSearch(query, limit);
    
    if (results.length > 0) {
      console.log(`[RAG] ✅ Keyword search found ${results.length} results`);
      return results;
    }

    console.log('[RAG] ⚠️ No documents found for query');
    return [];
  }

  /**
   * FULL-TEXT SEARCH (PRIMARY METHOD)
   * Requires: db.documentchunks.createIndex({ content: "text", documentName: "text" })
   */
  async textSearch(query, limit = this.topK) {
    try {
      const results = await DocumentChunk.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' }, importance: -1 })
        .limit(limit)
        .lean();

      return results;
    } catch (error) {
      // Text index might not exist
      console.warn('[RAG] Text search error:', error.message);
      return [];
    }
  }

  /**
   * REGEX SEARCH (SECONDARY METHOD)
   * Works without index, searches document content
   */
  async regexSearch(query, limit = this.topK) {
    try {
      // Split query into words and search
      const words = query.split(/\s+/).filter(w => w.length > 2);
      const regexPatterns = words.map(w => new RegExp(w, 'i'));

      // Build search condition
      const searchCondition = {
        $or: [
          ...regexPatterns.map(pattern => ({ content: { $regex: pattern } })),
          ...regexPatterns.map(pattern => ({ documentName: { $regex: pattern } })),
        ],
      };

      const results = await DocumentChunk.find(searchCondition)
        .sort({ importance: -1 })
        .limit(limit)
        .lean();

      return results;
    } catch (error) {
      console.warn('[RAG] Regex search error:', error.message);
      return [];
    }
  }

  /**
   * KEYWORD SEARCH (TERTIARY METHOD)
   * Simple keyword matching in document content
   */
  async keywordSearch(query, limit = this.topK) {
    try {
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      const results = await DocumentChunk.find()
        .lean()
        .then(docs => {
          // Score documents by keyword matches
          return docs
            .map(doc => {
              let score = 0;
              const content = doc.content.toLowerCase();
              keywords.forEach(keyword => {
                const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
                score += matches;
              });
              return { ...doc, keywordScore: score };
            })
            .filter(doc => doc.keywordScore > 0)
            .sort((a, b) => b.keywordScore - a.keywordScore)
            .slice(0, limit)
            .map(({ keywordScore, ...doc }) => doc);
        });

      return results;
    } catch (error) {
      console.warn('[RAG] Keyword search error:', error.message);
      return [];
    }
  }

  /**
   * INDEX DOCUMENTS
   * Splits documents into chunks and stores them
   */
  async indexDocuments(documents) {
    try {
      const chunks = [];

      for (const doc of documents) {
        const docChunks = this.splitIntoChunks(doc.content, doc.documentName);

        for (let i = 0; i < docChunks.length; i++) {
          const chunk = docChunks[i];

          const documentChunk = {
            documentId: doc.id || `doc_${Date.now()}_${Math.random()}`,
            documentName: doc.documentName,
            documentType: doc.type || 'markdown',
            filePath: doc.filePath || '',
            chunkIndex: i,
            content: chunk.text,
            contentSummary: chunk.text.substring(0, 500),
            section: chunk.section,
            subsection: chunk.subsection,
            importance: this.calculateImportance(chunk),
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            language: doc.language || 'en',
            indexed: true,
            indexedAt: new Date(),
          };

          chunks.push(documentChunk);
        }
      }

      // Bulk insert in MongoDB
      const result = await DocumentChunk.insertMany(chunks, { ordered: false });
      
      return {
        success: true,
        documentsIndexed: documents.length,
        chunksCreated: chunks.length,
        ids: result.map(r => r._id),
      };
    } catch (error) {
      console.error('[RAG] Document indexing error:', error);
      throw new ApiError(500, `Failed to index documents: ${error.message}`);
    }
  }

  /**
   * SPLIT DOCUMENTS INTO CHUNKS
   */
  splitIntoChunks(content, documentName) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, content.length);
      const chunkText = content.substring(startIndex, endIndex);

      const section = this.extractSection(content, startIndex);

      chunks.push({
        text: chunkText,
        section: section.main,
        subsection: section.sub,
        lineStart: this.countLines(content, 0, startIndex),
        lineEnd: this.countLines(content, 0, endIndex),
      });

      startIndex += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  /**
   * EXTRACT SECTION FROM CONTENT
   */
  extractSection(content, position) {
    const beforeContent = content.substring(0, position);
    const headers = beforeContent.match(/^#+\s+(.+)$/gm);

    const lastHeader = headers?.[headers.length - 1] || '';
    const mainSection = lastHeader.replace(/^#+\s+/, '') || 'General';

    return {
      main: mainSection,
      sub: '',
    };
  }

  /**
   * COUNT LINES IN TEXT
   */
  countLines(text, start, end) {
    return text.substring(start, end).split('\n').length;
  }

  /**
   * CALCULATE IMPORTANCE SCORE
   */
  calculateImportance(chunk) {
    let importance = 0.5;

    if (chunk.text.match(/^#+\s/m)) importance += 0.2;
    if (chunk.text.includes('```') || chunk.text.includes('function')) importance += 0.1;

    const keywords = ['production', 'security', 'authentication', 'error', 'fix', 'complete'];
    if (keywords.some(kw => chunk.text.toLowerCase().includes(kw))) importance += 0.1;

    return Math.min(importance, 1);
  }

  /**
   * GENERATE AI RESPONSE WITH RAG
   * Main entry point for AI assistant
   */
  async generateResponseWithRAG(userQuery, userId) {
    try {
      // 1️⃣ RETRIEVE RELEVANT DOCUMENTS
      const relevantDocs = await this.searchDocuments(userQuery, this.topK);

      if (relevantDocs.length === 0) {
        console.log('[RAG] No documents found');
        return {
          response: "Je n'ai pas trouvé d'informations pertinentes pour répondre à ta question. Pourrais-tu être plus spécifique?",
          sources: [],
          success: false,
          error: 'NO_DOCUMENTS_FOUND',
        };
      }

      console.log(`[RAG] Found ${relevantDocs.length} relevant documents`);

      // 2️⃣ BUILD CONTEXT FROM RETRIEVED DOCS
      const context = relevantDocs
        .map(
          (doc, idx) =>
            `[Source ${idx + 1}: ${doc.documentName}]\n${doc.content}\n---`
        )
        .join('\n\n');

      // 3️⃣ CHECK IF WE HAVE CLAUDE API KEY
      const hasClaudeKey = !!this.claudeApiKey && this.claudeApiKey.startsWith('sk-ant');

      let aiResponse = '';

      if (hasClaudeKey) {
        // 4️⃣ CALL CLAUDE API IF AVAILABLE
        console.log('[RAG] Calling Claude API...');
        try {
          const systemPrompt = `Tu es un assistant expert pour le projet Omni AI. 
Tu dois répondre aux questions de l'utilisateur basées UNIQUEMENT sur le contexte fourni.
Si l'information n'est pas dans le contexte, dis-le clairement.
Sois concis et précis. Inclus des références aux sources si pertinent.
Réponds en français si la question est en français.

CONTEXTE DU PROJET:
${context}`;

          const userMessage = {
            role: 'user',
            content: userQuery,
          };

          const response = await axios.post(
            this.claudeApiUrl,
            {
              model: this.claudeModel,
              max_tokens: 2048,
              system: systemPrompt,
              messages: [userMessage],
            },
            {
              headers: {
                'x-api-key': this.claudeApiKey,
                'anthropic-version': '2023-06-01',
              },
              timeout: 30000,
            }
          );

          aiResponse = response.data.content[0].text;
          console.log('[RAG] Claude response received');
        } catch (claudeError) {
          console.warn('[RAG] Claude API error, using context summary:', claudeError.message);
          // Fallback to context-based summary
          aiResponse = this.generateContextSummary(userQuery, relevantDocs);
        }
      } else {
        // Generate response from context if no Claude key
        console.log('[RAG] No Claude API key, using context summary');
        aiResponse = this.generateContextSummary(userQuery, relevantDocs);
      }

      // 5️⃣ RETURN RESPONSE WITH SOURCES
      return {
        response: aiResponse,
        sources: relevantDocs.map(doc => ({
          name: doc.documentName,
          type: doc.documentType,
          section: doc.section,
          path: doc.filePath,
          importance: doc.importance,
        })),
        success: true,
        retrievedDocuments: relevantDocs.length,
      };
    } catch (error) {
      console.error('[RAG] Error in generateResponseWithRAG:', error);
      throw new ApiError(500, `Failed to generate response: ${error.message}`);
    }
  }

  /**
   * GENERATE CONTEXT SUMMARY (FALLBACK)
   * When Claude API is not available
   */
  generateContextSummary(query, documents) {
    if (documents.length === 0) {
      return "Aucun document trouvé pour répondre à cette question.";
    }

    const summary = documents
      .slice(0, 3)
      .map(doc => {
        const preview = doc.content.substring(0, 300).replace(/\n/g, ' ');
        return `• **${doc.documentName}** (${doc.section}): ${preview}...`;
      })
      .join('\n\n');

    return `Basé sur les documents trouvés:\n\n${summary}\n\nPour une réponse plus détaillée, configurer l'API Claude.`;
  }

  /**
   * CREATE TEXT INDEXES (call this once)
   */
  async createTextIndexes() {
    try {
      await DocumentChunk.collection.createIndex({
        content: 'text',
        documentName: 'text',
        section: 'text',
      });
      console.log('[RAG] Text indexes created successfully');
      return { success: true };
    } catch (error) {
      console.warn('[RAG] Index creation error (may already exist):', error.message);
      return { success: false, error: error.message };
    }
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
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('[RAG] Status check error:', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * CLEAR ALL INDEXED DOCUMENTS
   */
  async clearIndex() {
    try {
      const result = await DocumentChunk.deleteMany({});
      console.log(`[RAG] Cleared ${result.deletedCount} chunks`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error('[RAG] Clear index error:', error);
      throw new ApiError(500, `Failed to clear index: ${error.message}`);
    }
  }
}

// Export single instance
export default new RAGServiceFixed();
