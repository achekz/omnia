/**
 * ==========================================
 * FILE UPLOAD CONTROLLER
 * ==========================================
 * Handles file uploads to AWS S3
 */

import AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Multer configuration - store in memory then upload to S3
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents allowed.'));
    }
  }
});

/**
 * Upload single file to S3
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const userId = req.user.id;
    const file = req.file;
    
    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    
    // Upload to S3
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `uploads/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private', // Keep files private
      ServerSideEncryption: 'AES256'
    };
    
    const s3Response = await s3.upload(params).promise();
    
    // Respond with S3 URL
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: s3Response.ETag.replace(/"/g, ''),
        url: s3Response.Location,
        bucket: s3Response.Bucket,
        key: s3Response.Key,
        size: file.size,
        type: file.mimetype,
        name: file.originalname,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }
    
    const userId = req.user.id;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const ext = path.extname(file.originalname);
      const filename = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `uploads/${filename}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private',
        ServerSideEncryption: 'AES256'
      };
      
      const s3Response = await s3.upload(params).promise();
      
      uploadedFiles.push({
        id: s3Response.ETag.replace(/"/g, ''),
        url: s3Response.Location,
        key: s3Response.Key,
        size: file.size,
        type: file.mimetype,
        name: file.originalname
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multi-upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

/**
 * Get signed URL for downloading file (for private S3 objects)
 */
export const getDownloadUrl = async (req, res) => {
  try {
    const { fileKey } = req.params;
    const userId = req.user.id;
    
    // Verify user owns the file
    if (!fileKey.includes(userId)) {
      return res.status(403).json({ message: 'Unauthorized access to file' });
    }
    
    // Generate signed URL valid for 1 hour
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Expires: 3600
    });
    
    res.status(200).json({
      success: true,
      url: signedUrl,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Get URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
      error: error.message
    });
  }
};

/**
 * Delete file from S3
 */
export const deleteFile = async (req, res) => {
  try {
    const { fileKey } = req.params;
    const userId = req.user.id;
    
    // Verify user owns the file
    if (!fileKey.includes(userId)) {
      return res.status(403).json({ message: 'Unauthorized access to file' });
    }
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    };
    
    await s3.deleteObject(params).promise();
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed',
      error: error.message
    });
  }
};

/**
 * Upload file with task attachment
 */
export const uploadTaskAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const { taskId } = req.params;
    const userId = req.user.id;
    const file = req.file;
    
    // Generate unique filename with task context
    const ext = path.extname(file.originalname);
    const filename = `${userId}/tasks/${taskId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `attachments/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
      ServerSideEncryption: 'AES256',
      Metadata: {
        taskId,
        userId,
        uploadedAt: new Date().toISOString()
      }
    };
    
    const s3Response = await s3.upload(params).promise();
    
    res.status(200).json({
      success: true,
      message: 'Task attachment uploaded successfully',
      attachment: {
        id: s3Response.ETag.replace(/"/g, ''),
        url: s3Response.Location,
        key: s3Response.Key,
        size: file.size,
        type: file.mimetype,
        name: file.originalname,
        taskId
      }
    });
  } catch (error) {
    console.error('Task attachment upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Task attachment upload failed',
      error: error.message
    });
  }
};

/**
 * Upload profile avatar
 */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }
    
    const userId = req.user.id;
    const file = req.file;
    
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files allowed' });
    }
    
    // Generate filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}/avatar/profile${ext}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `avatars/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Allow public read for avatars
      ServerSideEncryption: 'AES256',
      CacheControl: 'max-age=31536000' // Cache for 1 year
    };
    
    const s3Response = await s3.upload(params).promise();
    
    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: {
        url: s3Response.Location,
        key: s3Response.Key,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Avatar upload failed',
      error: error.message
    });
  }
};

/**
 * List user files
 */
export const listUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prefix = '' } = req.query;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: `uploads/${userId}/${prefix}`,
      MaxKeys: 100
    };
    
    const response = await s3.listObjectsV2(params).promise();
    
    const files = (response.Contents || []).map(item => ({
      name: item.Key.split('/').pop(),
      key: item.Key,
      size: item.Size,
      modified: item.LastModified,
      url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${item.Key}`
    }));
    
    res.status(200).json({
      success: true,
      files,
      totalFiles: response.KeyCount
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: error.message
    });
  }
};

/**
 * Batch upload with progress tracking
 */
export const uploadWithProgress = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const userId = req.user.id;
    const file = req.file;
    const totalSize = file.size;
    let uploadedSize = 0;
    
    // Track progress
    const progressCallback = (progress) => {
      uploadedSize = progress.loaded;
      const percentage = Math.round((uploadedSize / totalSize) * 100);
      
      // Emit progress via WebSocket if available
      if (req.io) {
        req.io.emit('upload:progress', { percentage, uploadedSize, totalSize });
      }
    };
    
    const ext = path.extname(file.originalname);
    const filename = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `uploads/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
      ServerSideEncryption: 'AES256'
    };
    
    const s3Response = await s3.upload(params).promise();
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        url: s3Response.Location,
        key: s3Response.Key,
        size: file.size,
        type: file.mimetype,
        name: file.originalname,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

export default {
  upload,
  uploadFile,
  uploadMultipleFiles,
  getDownloadUrl,
  deleteFile,
  uploadTaskAttachment,
  uploadAvatar,
  listUserFiles,
  uploadWithProgress
};
