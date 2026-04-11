import mongoose from 'mongoose';

/**
 * Document Chunk Model - For RAG (Retrieval-Augmented Generation)
 * Stores document chunks with embeddings for semantic search
 */
const documentChunkSchema = new mongoose.Schema(
  {
    // Document metadata
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      enum: ['markdown', 'javascript', 'typescript', 'python', 'json', 'other'],
      default: 'markdown',
    },
    filePath: {
      type: String,
      required: true,
    },

    // Chunk content
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentSummary: {
      type: String,
      maxlength: 500,
    },

    // Vector embedding
    embedding: {
      type: [Number],
      required: true,
      index: 'hnsw', // MongoDB HNSW vector index
    },

    // Metadata for retrieval
    section: String, // e.g., "Authentication", "Caching", "Validation"
    subsection: String,
    importance: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5, // 0-1 relevance score
    },

    // Source information
    lineStart: Number,
    lineEnd: Number,
    language: String, // 'en' or 'fr'

    // Indexing status
    indexed: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'documentChunks',
  }
);

// Compound index for document search
documentChunkSchema.index({
  documentId: 1,
  chunkIndex: 1,
});

// Vector search index
documentChunkSchema.index({
  embedding: 'cosmosSearch',
  'documentType': 1,
  'importance': -1,
});

export default mongoose.model('DocumentChunk', documentChunkSchema);
