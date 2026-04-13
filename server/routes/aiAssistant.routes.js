import express from 'express';
import { protect } from '../middleware/auth.js';
import ragService from '../services/ragService-mongodb.js';
import {
  chatWithAI,
  semanticSearch,
  indexDocuments,
  getIndexingStatus,
  reloadDocuments,
  getAISuggestions,
  advancedSearch,
  getContextForQuery,
  indexProjectDocuments,
  getIndexStatus,
} from '../controllers/aiAssistantController.js';

const router = express.Router();

/**
 * AI ASSISTANT ROUTES
 * Endpoints for RAG-powered AI assistant
 */

/**
 * SIMPLE CHAT ENDPOINT (No Auth Required)
 * Frontend hits: POST /api/ai/ask
 */
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        response: 'Please provide a query',
      });
    }

    console.log('[AI] Chat query:', query);

    // Get response from RAG
    const result = await ragService.generateResponseWithRAG(query, null);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AI] Chat error:', error);
    return res.status(500).json({
      success: false,
      response: 'Error processing query: ' + error.message,
    });
  }
});

/**
 * ASK ENDPOINT (for frontend compatibility)
 * Frontend hits: POST /api/ai/ask with { message: "..." }
 */
router.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.json({
        success: false,
        response: 'Please provide a message',
      });
    }

    console.log('[AI] Ask message:', message);

    // Get response from RAG
    const result = await ragService.generateResponseWithRAG(message, null);

    return res.json({
      response: result.response,
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AI] Ask error:', error);
    return res.json({
      success: false,
      response: 'Error: ' + error.message,
    });
  }
});

/**
 * @route   POST /api/ai/search
 * @desc    Semantic search across documents
 * @access  Private
 * @body    { query: string, limit?: number }
 * @returns { results: Array, count: number }
 *
 * @example
 * POST /api/ai/search
 * {
 *   "query": "validation input",
 *   "limit": 5
 * }
 */
router.post('/search', protect, semanticSearch);

/**
 * @route   POST /api/ai/index
 * @desc    Load and index documents (Admin only)
 * @access  Private/Admin
 * @returns { success: boolean, documentsIndexed: number, chunksCreated: number }
 */
router.post('/index', protect, indexDocuments);

/**
 * @route   GET /api/ai/status
 * @desc    Get indexing status and statistics
 * @access  Private
 * @returns { totalChunks: number, byType: Array, lastUpdated: Date }
 */
router.get('/status', protect, getIndexingStatus);

/**
 * @route   POST /api/ai/index-project
 * @desc    Load and index all project documents for RAG
 * @access  Public (for setup)
 * @returns { success: boolean, documentsIndexed: number, chunksCreated: number }
 */
router.post('/index-project', indexProjectDocuments);

/**
 * @route   GET /api/ai/index-status
 * @desc    Get current index statistics
 * @access  Public
 * @returns { status: string, totalChunks: number, documentsIndexed: number }
 */
router.get('/index-status', getIndexStatus);

/**
 * @route   POST /api/ai/reload
 * @desc    Reload documents (Admin only, development)
 * @access  Private/Admin
 * @returns { success: boolean, message: string }
 */
router.post('/reload', protect, reloadDocuments);

/**
 * @route   POST /api/ai/suggestions
 * @desc    Get AI suggestions for a query
 * @access  Private
 * @body    { query: string }
 * @returns { suggestions: Array }
 *
 * @example
 * POST /api/ai/suggestions
 * {
 *   "query": "cache"
 * }
 * Response:
 * {
 *   "suggestions": [
 *     {
 *       "title": "Caching Layer",
 *       "description": "Redis caching...",
 *       "source": "redis.js",
 *       "relevance": 0.92
 *     }
 *   ]
 * }
 */
router.post('/suggestions', protect, getAISuggestions);

/**
 * @route   POST /api/ai/advanced-search
 * @desc    Advanced search with filters
 * @access  Private
 * @body    {
 *   query: string,
 *   documentType?: 'markdown'|'javascript'|'typescript'|'python',
 *   section?: string,
 *   limit?: number,
 *   sortBy?: 'relevance'|'date'
 * }
 * @returns { results: Array, count: number, filters: Object }
 *
 * @example
 * POST /api/ai/advanced-search
 * {
 *   "query": "authentication",
 *   "documentType": "javascript",
 *   "section": "Security",
 *   "limit": 10,
 *   "sortBy": "relevance"
 * }
 */
router.post('/advanced-search', protect, advancedSearch);

/**
 * @route   POST /api/ai/context
 * @desc    Get all relevant context for a query
 * @access  Private
 * @body    { query: string }
 * @returns {
 *   query: string,
 *   relevantDocuments: Array,
 *   totalDocuments: number,
 *   generatedAt: Date
 * }
 */
router.post('/context', protect, getContextForQuery);

export default router;
