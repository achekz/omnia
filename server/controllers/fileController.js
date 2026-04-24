import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler.js';

const uploadsDir = 'uploads';

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration - disk storage
export const upload = multer({
  dest: uploadsDir + '/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
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
      cb(new Error('Invalid file type'));
    }
  }
});

export const uploadFile = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const userId = req.user.id;
    const file = req.file;
    
    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    
    // Move temp file
    await fsPromises.rename(file.path, finalPath);
    
    const fileUrl = `/uploads/${filename}`;
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: file.originalname,
        filename,
        path: finalPath,
        url: fileUrl,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    // Cleanup temp file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
});

export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }
    
    const userId = req.user.id;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const ext = path.extname(file.originalname);
      const filename = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const finalPath = path.join(uploadsDir, filename);
      
      await fsPromises.rename(file.path, finalPath);
      
      uploadedFiles.push({
        name: file.originalname,
        filename,
        path: finalPath,
        url: `/uploads/${filename}`,
        size: file.size,
        type: file.mimetype
      });
    }
    
    res.status(200).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded`,
      files: uploadedFiles
    });
  } catch (error) {
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
    res.status(500).json({ message: error.message });
  }
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }
    
    if (!req.file.mimetype.startsWith('image/')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Only images allowed' });
    }
    
    const userId = req.user.id;
    const ext = path.extname(req.file.originalname);
    const filename = `avatars/${userId}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    
    await fsPromises.rename(req.file.path, finalPath);
    
    res.status(200).json({
      success: true,
      message: 'Avatar uploaded',
      avatar: {
        url: `/uploads/${filename}`,
        filename,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
});

export const uploadTaskAttachment = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }
    
    const { taskId } = req.params;
    const userId = req.user.id;
    const ext = path.extname(req.file.originalname);
    const filename = `attachments/${userId}/tasks/${taskId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    
    await fsPromises.rename(req.file.path, finalPath);
    
    res.status(200).json({
      success: true,
      message: 'Attachment uploaded',
      attachment: {
        filename,
        url: `/uploads/${filename}`,
        size: req.file.size,
        type: req.file.mimetype,
        name: req.file.originalname,
        taskId
      }
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
});

export const getDownloadUrl = asyncHandler(async (req, res) => {
  const { fileKey } = req.params;
  const fullPath = path.join(uploadsDir, fileKey);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  res.status(200).json({
    success: true,
    url: `/uploads/${fileKey}`,
    expiresIn: 3600
  });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const { fileKey } = req.params;
  const fullPath = path.join(uploadsDir, fileKey);
  
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  await fsPromises.unlink(fullPath);
  
  res.status(200).json({ success: true, message: 'File deleted' });
});

export const listUserFiles = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userDir = path.join(uploadsDir, userId);
  
  let files = [];
  if (fs.existsSync(userDir)) {
    const allFiles = await fsPromises.readdir(userDir, { withFileTypes: true, recursive: true });
    files = allFiles.filter(dirent => dirent.isFile()).map(dirent => {
      const fullPath = path.join(userDir, dirent.name);
      const stat = fs.statSync(fullPath);
      return {
        name: dirent.name,
        path: dirent.path,
        relativePath: path.relative(uploadsDir, fullPath),
        size: stat.size,
        modified: stat.mtime,
        url: `/uploads/${path.relative(uploadsDir, fullPath)}`
      };
    });
  }
  
  res.status(200).json({
    success: true,
    files,
    totalFiles: files.length
  });
});

export const uploadWithProgress = asyncHandler(async (req, res) => {
  await uploadFile(req, res);
});

export default {
  upload,
  uploadFile,
  uploadMultipleFiles,
  uploadAvatar,
  uploadTaskAttachment,
  getDownloadUrl,
  deleteFile,
  listUserFiles,
  uploadWithProgress
};
