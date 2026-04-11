import axios from 'axios';
import { HfInference } from '@huggingface/inference';
import DocumentChunk from '../models/DocumentChunk.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * RAG SERVICE - Retrieval-Augmented Generation
 * Handles document embeddings, indexing, and semantic search
 */

class RAGService {
  constructor() {
    // Initialize Hugging Face embeddings
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    // Model for embeddings (lightweight and efficient)
    this.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
    
    // Claude API for LLM
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.claudeModel = 'claude-3-sonnet-20240229';
    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
    
    // Search parameters
    this.chunkSize = 1000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
    this.topK = 5; // Top K similar documents to retrieve
  }

  /**
   * GET OR CREATE EMBEDDINGS
   * Converts text to embeddings using Hugging Face
   */
  async getEmbeddings(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Call Hugging Face API
      const response = await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: text,
      });

      // Returns a 384-dimensional vector
      return Array.from(response);
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new ApiError(500, `Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * INDEX DOCUMENTS
   * Split documents into chunks and create embeddings
   */
  async indexDocuments(documents) {
    try {
      const chunks = [];

      for (const doc of documents) {
        const docChunks = this.splitIntoChunks(doc.content, doc.documentName);

        for (let i = 0; i < docChunks.length; i++) {
          const chunk = docChunks[i];

          // Generate embedding
          const embedding = await this.getEmbeddings(chunk.text);

          // Create document chunk
          const documentChunk = {
            documentId: doc.id || `doc_${Date.now()}_${Math.random()}`,
            documentName: doc.documentName,
            documentType: doc.type || 'markdown',
            filePath: doc.filePath || '',
            chunkIndex: i,
            content: chunk.text,
            contentSummary: chunk.text.substring(0, 500),
            embedding: embedding,
            section: chunk.section,
            subsection: chunk.subsection,
            importance: this.calculateImportance(chunk),
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            language: doc.language || 'en',
            indexed: true,
          };

          chunks.push(documentChunk);

          // Rate limiting for API
          await this.delay(100);
        }
      }

      // Bulk insert/update in MongoDB
      const result = await DocumentChunk.insertMany(chunks, { ordered: false });
      
      return {
        success: true,
        documentsIndexed: documents.length,
        chunksCreated: chunks.length,
        ids: result.map(r => r._id),
      };
    } catch (error) {
      console.error('Document indexing error:', error);
      throw new ApiError(500, `Failed to index documents: ${error.message}`);
    }
  }

  /**
   * SPLIT DOCUMENTS INTO CHUNKS
   * Creates overlapping chunks for better context
   */
  splitIntoChunks(content, documentName) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, content.length);
      const chunkText = content.substring(startIndex, endIndex);

      // Extract section from content (markdown headers)
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
   * CALCULATE IMPORTANCE SCORE
   * Determines relevance based on content type
   */
  calculateImportance(chunk) {
    let importance = 0.5; // Default

    // Boost for headers
    if (chunk.text.match(/^#+\s/m)) importance += 0.2;

    // Boost for code
    if (chunk.text.includes('```') || chunk.text.includes('function')) {
      importance += 0.1;
    }

    // Boost for keywords
    const keywords = ['production', 'security', 'authentication', 'error', 'fix', 'complete'];
    if (keywords.some(kw => chunk.text.toLowerCase().includes(kw))) {
      importance += 0.1;
    }

    return Math.min(importance, 1);
  }

  /**
   * EXTRACT SECTION FROM CONTENT
   */
  extractSection(content, position) {
    const beforeContent = content.substring(0, position);
    const headers = beforeContent.match(/^##?\s+(.+)$/gm);

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
   * SEMANTIC SEARCH
   * Find most relevant documents using vector similarity
   */
  async semanticSearch(query, limit = this.topK, filters = {}) {
    try {
      // Generate query embedding
      const queryEmbedding = await this.getEmbeddings(query);

      // Search with vector similarity
      const results = await DocumentChunk.aggregate([
        {
          $search: {
            cosmosSearch: {
              vector: queryEmbedding,
              k: limit,
            },
            returnScore: true,
          },
        },
        {
          $project: {
            similarity: { $meta: 'searchScore' },
            _id: 1,
            content: 1,
            documentName: 1,
            documentType: 1,
            filePath: 1,
            section: 1,
            importance: 1,
          },
        },
        {
          $sort: { similarity: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      // Fallback to text search
      return await this.textSearch(query, limit);
    }
  }

  /**
   * TEXT SEARCH FALLBACK
   * Simple keyword-based search
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
      console.error('Text search error:', error);
      // Fallback to regex search
      return await this.regexSearch(query, limit);
    }
  }

  /**
   * REGEX SEARCH FALLBACK
   * Last resort simple search
   */
  async regexSearch(query, limit = this.topK) {
    try {
      const results = await DocumentChunk.find(
        { content: { $regex: query, $options: 'i' } }
      )
        .sort({ importance: -1 })
        .limit(limit)
        .lean();

      return results;
    } catch (error) {
      console.error('Regex search error:', error);
      return [];
    }
  }

  /**
   * GENERATE AI RESPONSE WITH RAG
   * Uses Claude API with retrieved context
   */
  async generateResponseWithRAG(userQuery, userId) {
    try {
      // 1️⃣ RETRIEVE RELEVANT DOCUMENTS
      const relevantDocs = await this.semanticSearch(userQuery, this.topK);

      if (relevantDocs.length === 0) {
        return {
          response: "Je n'ai pas trouvé d'informations pertinentes pour répondre à ta question.",
          sources: [],
          success: false,
        };
      }

      // 2️⃣ BUILD CONTEXT FROM RETRIEVED DOCS
      const context = relevantDocs
        .map(
          (doc, idx) =>
            `[Source ${idx + 1}: ${doc.documentName}]\n${doc.content}\n---`
        )
        .join('\n\n');

      // 3️⃣ BUILD PROMPT WITH CONTEXT
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

      // 4️⃣ CALL CLAUDE API
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
        }
      );

      // 5️⃣ EXTRACT RESPONSE
      const aiResponse = response.data.content[0].text;

      // 6️⃣ RETURN RESPONSE WITH SOURCES
      return {
        response: aiResponse,
        sources: relevantDocs.map(doc => ({
          name: doc.documentName,
          type: doc.documentType,
          section: doc.section,
          path: doc.filePath,
          relevance: doc.similarity || doc.importance,
        })),
        success: true,
        tokensUsed: response.data.usage,
      };
    } catch (error) {
      console.error('RAG response generation error:', error);
      throw new ApiError(500, `Failed to generate response: ${error.message}`);
    }
  }

  /**
   * SAVE CHAT HISTORY
   * Store conversations for learning
   */
  async saveChatMessage(userId, query, response, sources) {
    try {
      // This can be stored in a ChatHistory model
      const chatEntry = {
        userId,
        query,
        response,
        sources,
        timestamp: new Date(),
        helpful: null, // User feedback
      };

      // Store in database (ChatHistory model)
      // await ChatHistory.create(chatEntry);

      return chatEntry;
    } catch (error) {
      console.error('Error saving chat history:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * UPDATE DOCUMENTS
   * Reindex when documents change
   */
  async updateDocuments(documents) {
    try {
      // Delete old chunks
      const docIds = documents.map(d => d.id);
      await DocumentChunk.deleteMany({ documentId: { $in: docIds } });

      // Index new documents
      return await this.indexDocuments(documents);
    } catch (error) {
      console.error('Document update error:', error);
      throw new ApiError(500, `Failed to update documents: ${error.message}`);
    }
  }

  /**
   * GET INDEXING STATUS
   */
  async getIndexingStatus() {
    try {
      const stats = await DocumentChunk.aggregate([
        {
          $group: {
            _id: '$documentType',
            count: { $sum: 1 },
            avgImportance: { $avg: '$importance' },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      const total = await DocumentChunk.countDocuments();

      return {
        totalChunks: total,
        byType: stats,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error getting indexing status:', error);
      return { totalChunks: 0, byType: [], lastUpdated: null };
    }
  }

  /**
   * DELAY HELPER
   * Rate limiting for API calls
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RAGService();
