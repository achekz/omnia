import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  chatWithAI,
  semanticSearch,
  indexDocuments,
  getIndexingStatus,
  reloadDocuments,
  getAISuggestions,
  advancedSearch,
  getContextForQuery,
} from '../controllers/aiAssistantController.js';

const router = express.Router();

/**
 * AI ASSISTANT ROUTES
 * Endpoints for RAG-powered AI assistant
 */

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with AI assistant (RAG-enhanced)
 * @access  Private
 * @body    { query: string, conversationId?: string }
 * @returns { response: string, sources: Array, success: boolean }
 *
 * @example
 * POST /api/ai/chat
 * {
 *   "query": "Comment faire l'authentification?"
 * }
 * Response:
 * {
 *   "response": "L'authentification utilise JWT...",
 *   "sources": [{name: "auth.js", section: "Authentication"}],
 *   "success": true
 * }
 */
router.post('/chat', protect, chatWithAI);

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
