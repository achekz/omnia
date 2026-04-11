import ragService from '../services/ragService.js';
import documentLoader from '../services/documentLoader.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * AI ASSISTANT CONTROLLER
 * Handles chat, queries, and document management
 */

/**
 * CHAT WITH AI
 * POST /api/ai/chat
 * Send a query and get RAG-enhanced response
 */
export const chatWithAI = asyncHandler(async (req, res) => {
  const { query, conversationId } = req.body;
  const userId = req.user._id;

  // Validation
  if (!query || query.trim().length < 2) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, 'Query must be at least 2 characters')
      );
  }

  if (query.length > 5000) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Query is too long (max 5000 characters)'));
  }

  // Generate response with RAG
  const ragResponse = await ragService.generateResponseWithRAG(query, userId);

  if (!ragResponse.success) {
    return res
      .status(200)
      .json(new ApiResponse(200, ragResponse, 'No relevant documents found'));
  }

  // Save to conversation history (optional)
  // await ChatHistory.create({
  //   userId,
  //   conversationId,
  //   query,
  //   response: ragResponse.response,
  //   sources: ragResponse.sources,
  //   timestamp: new Date(),
  // });

  return res.json(
    new ApiResponse(200, ragResponse, 'Response generated successfully')
  );
});

/**
 * GET SEMANTIC SEARCH RESULTS
 * POST /api/ai/search
 * Search for documents based on query
 */
export const semanticSearch = asyncHandler(async (req, res) => {
  const { query, limit = 5 } = req.body;

  if (!query || query.trim().length < 1) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Search query is required'));
  }

  // Perform semantic search
  const results = await ragService.semanticSearch(query, Math.min(limit, 20));

  if (results.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { results: [], count: 0 },
          'No documents found matching your search'
        )
      );
  }

  return res.json(
    new ApiResponse(
      200,
      {
        results: results.map(r => ({
          id: r._id,
          content: r.content.substring(0, 500) + '...',
          fullContent: r.content,
          source: r.documentName,
          type: r.documentType,
          section: r.section,
          relevance: r.similarity || r.importance,
        })),
        count: results.length,
      },
      'Search completed successfully'
    )
  );
});

/**
 * INDEX DOCUMENTS
 * POST /api/ai/index
 * Load and index documents from workspace
 */
export const indexDocuments = asyncHandler(async (req, res) => {
  // Check admin permission
  if (req.user.role !== 'admin' && req.user.role !== 'cabinet_admin') {
    return res.status(403).json(new ApiResponse(403, null, 'Not authorized'));
  }

  const result = await documentLoader.loadAndIndex();

  if (!result.success) {
    return res.status(500).json(new ApiResponse(500, result, 'Indexing failed'));
  }

  return res.json(
    new ApiResponse(200, result, 'Documents indexed successfully')
  );
});

/**
 * GET INDEXING STATUS
 * GET /api/ai/status
 * Get current indexing status and statistics
 */
export const getIndexingStatus = asyncHandler(async (req, res) => {
  const status = await ragService.getIndexingStatus();

  return res.json(new ApiResponse(200, status, 'Status retrieved successfully'));
});

/**
 * RELOAD DOCUMENTS
 * POST /api/ai/reload
 * Reload documents for development/updates
 */
export const reloadDocuments = asyncHandler(async (req, res) => {
  // Admin only
  if (req.user.role !== 'admin' && req.user.role !== 'cabinet_admin') {
    return res.status(403).json(new ApiResponse(403, null, 'Not authorized'));
  }

  const result = await documentLoader.reloadDocuments();

  if (!result.success) {
    return res.status(500).json(new ApiResponse(500, result, 'Reload failed'));
  }

  return res.json(
    new ApiResponse(200, result, 'Documents reloaded successfully')
  );
});

/**
 * GET AI SUGGESTIONS
 * POST /api/ai/suggestions
 * Get smart suggestions based on query
 */
export const getAISuggestions = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query || query.trim().length < 2) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Query is required'));
  }

  // Get semantic search results
  const results = await ragService.semanticSearch(query, 3);

  if (results.length === 0) {
    return res.json(
      new ApiResponse(200, { suggestions: [] }, 'No suggestions available')
    );
  }

  // Extract key points from results
  const suggestions = results.map(r => ({
    title: r.section || r.documentName,
    description: r.content.substring(0, 200),
    source: r.documentName,
    relevance: r.similarity || 0.7,
  }));

  return res.json(
    new ApiResponse(200, { suggestions }, 'Suggestions generated successfully')
  );
});

/**
 * ADVANCED SEARCH
 * POST /api/ai/advanced-search
 * Search with filters and sorting
 */
export const advancedSearch = asyncHandler(async (req, res) => {
  const {
    query,
    documentType,
    section,
    limit = 10,
    sortBy = 'relevance',
  } = req.body;

  if (!query) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Query is required'));
  }

  let results = await ragService.semanticSearch(query, Math.min(limit, 50));

  // Filter by document type
  if (documentType) {
    results = results.filter(r => r.documentType === documentType);
  }

  // Filter by section
  if (section) {
    results = results.filter(r => r.section?.includes(section));
  }

  // Sort
  if (sortBy === 'date') {
    results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } else {
    // Default: relevance
    results.sort((a, b) => (b.similarity || b.importance) - (a.similarity || a.importance));
  }

  // Take limit
  results = results.slice(0, limit);

  return res.json(
    new ApiResponse(
      200,
      {
        results: results.map(r => ({
          id: r._id,
          content: r.content,
          source: r.documentName,
          type: r.documentType,
          section: r.section,
          relevance: r.similarity || r.importance,
        })),
        count: results.length,
        filters: {
          documentType,
          section,
          limit,
          sortBy,
        },
      },
      'Search completed'
    )
  );
});

/**
 * GET CONTEXT FOR QUERY
 * POST /api/ai/context
 * Get all relevant context for a specific query
 */
export const getContextForQuery = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json(new ApiResponse(400, null, 'Query required'));
  }

  const relevantDocs = await ragService.semanticSearch(query, 10);

  const context = {
    query,
    relevantDocuments: relevantDocs.map(doc => ({
      id: doc._id,
      name: doc.documentName,
      type: doc.documentType,
      section: doc.section,
      content: doc.content,
      relevance: doc.similarity || doc.importance,
    })),
    totalDocuments: relevantDocs.length,
    generatedAt: new Date(),
  };

  return res.json(
    new ApiResponse(200, context, 'Context retrieved successfully')
  );
});

export default {
  chatWithAI,
  semanticSearch,
  indexDocuments,
  getIndexingStatus,
  reloadDocuments,
  getAISuggestions,
  advancedSearch,
  getContextForQuery,
};
