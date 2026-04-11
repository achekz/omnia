/**
 * ==========================================
 * FILE UPLOAD ROUTES
 * ==========================================
 * Handles file uploads, downloads, and management
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  upload,
  uploadFile,
  uploadMultipleFiles,
  getDownloadUrl,
  deleteFile,
  uploadTaskAttachment,
  uploadAvatar,
  listUserFiles,
  uploadWithProgress
} from '../controllers/fileController.js';

const router = express.Router();

/**
 * POST /api/upload
 * Upload single file
 * 
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a single file
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file or no file provided
 *       500:
 *         description: Upload failed
 */
router.post('/', authenticateToken, upload.single('file'),
  asyncHandler(async (req, res) => {
    await uploadFile(req, res);
  })
);

/**
 * POST /api/upload/multiple
 * Upload multiple files at once
 */
router.post('/multiple', authenticateToken, upload.array('files', 10),
  asyncHandler(async (req, res) => {
    await uploadMultipleFiles(req, res);
  })
);

/**
 * POST /api/upload/avatar
 * Upload user profile avatar
 */
router.post('/avatar', authenticateToken, upload.single('avatar'),
  asyncHandler(async (req, res) => {
    await uploadAvatar(req, res);
  })
);

/**
 * POST /api/upload/task/:taskId
 * Upload file as task attachment
 */
router.post('/task/:taskId', authenticateToken, upload.single('attachment'),
  asyncHandler(async (req, res) => {
    await uploadTaskAttachment(req, res);
  })
);

/**
 * GET /api/upload/download/:fileKey
 * Get signed URL for downloading private file
 * 
 * @swagger
 * /api/upload/download/{fileKey}:
 *   get:
 *     tags: [Upload]
 *     summary: Get download URL for a file
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 file key
 *     responses:
 *       200:
 *         description: Signed URL returned
 */
router.get('/download/:fileKey', authenticateToken,
  asyncHandler(async (req, res) => {
    await getDownloadUrl(req, res);
  })
);

/**
 * DELETE /api/upload/:fileKey
 * Delete file from S3
 */
router.delete('/:fileKey', authenticateToken,
  asyncHandler(async (req, res) => {
    await deleteFile(req, res);
  })
);

/**
 * GET /api/upload/list
 * List all user files
 */
router.get('/list', authenticateToken,
  asyncHandler(async (req, res) => {
    await listUserFiles(req, res);
  })
);

/**
 * POST /api/upload/progress
 * Upload with progress tracking (WebSocket compatible)
 */
router.post('/progress', authenticateToken, upload.single('file'),
  asyncHandler(async (req, res) => {
    await uploadWithProgress(req, res);
  })
);

export default router;
