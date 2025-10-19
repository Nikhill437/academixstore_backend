import multer from 'multer';
import path from 'path';
import { S3_CONFIG } from '../config/aws.js';

/**
 * File Upload Middleware using Multer
 * Handles multipart/form-data for file uploads
 */

// Memory storage for direct S3 upload (recommended for cloud deployment)
const memoryStorage = multer.memoryStorage();

// Disk storage for temporary files (useful for local development)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // Temporary storage
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Get allowed types based on field name
  let allowedTypes;
  
  switch (file.fieldname) {
    case 'book':
    case 'pdf':
      allowedTypes = S3_CONFIG.allowedTypes.bookPdf;
      break;
    case 'cover':
    case 'image':
    case 'advertisement':
      allowedTypes = S3_CONFIG.allowedTypes.images;
      break;
    default:
      // Allow all types if field name doesn't match (let service validate)
      return cb(null, true);
  }

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

// Create multer instances
const createMulterConfig = (storage) => ({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: Math.max(
      S3_CONFIG.limits.bookPdf,
      S3_CONFIG.limits.coverImage,
      S3_CONFIG.limits.adImage
    ), // Use maximum allowed size
    files: 5, // Maximum 5 files per request
    fieldSize: 2 * 1024 * 1024, // 2MB field value size
  }
});

// Memory storage multer (recommended for production)
const uploadMemory = multer(createMulterConfig(memoryStorage));

// Disk storage multer (useful for development/testing)
const uploadDisk = multer(createMulterConfig(diskStorage));

// Use memory storage by default (better for cloud deployment)
const upload = uploadMemory;

/**
 * Middleware for single file upload
 */
export const uploadSingleFile = (fieldName) => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                message: 'File too large',
                error: 'FILE_TOO_LARGE'
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                message: 'Too many files',
                error: 'TOO_MANY_FILES'
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                message: `Unexpected field name. Expected: ${fieldName}`,
                error: 'UNEXPECTED_FILE_FIELD'
              });
            default:
              return res.status(400).json({
                success: false,
                message: err.message,
                error: 'UPLOAD_ERROR'
              });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: err.message,
            error: 'FILE_VALIDATION_ERROR'
          });
        }
      }
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `No file uploaded for field: ${fieldName}`,
          error: 'NO_FILE'
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware for multiple file upload
 */
export const uploadMultipleFiles = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const arrayUpload = upload.array(fieldName, maxCount);
    
    arrayUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                message: 'One or more files are too large',
                error: 'FILE_TOO_LARGE'
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                message: `Too many files. Maximum allowed: ${maxCount}`,
                error: 'TOO_MANY_FILES'
              });
            default:
              return res.status(400).json({
                success: false,
                message: err.message,
                error: 'UPLOAD_ERROR'
              });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: err.message,
            error: 'FILE_VALIDATION_ERROR'
          });
        }
      }
      
      next();
    });
  };
};

/**
 * Middleware for mixed file upload (different field names)
 */
export const uploadMixedFiles = (fields) => {
  return (req, res, next) => {
    const fieldsUpload = upload.fields(fields);
    
    fieldsUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                message: 'One or more files are too large',
                error: 'FILE_TOO_LARGE'
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                message: 'Too many files uploaded',
                error: 'TOO_MANY_FILES'
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({
                success: false,
                message: 'Unexpected file field',
                error: 'UNEXPECTED_FILE_FIELD'
              });
            default:
              return res.status(400).json({
                success: false,
                message: err.message,
                error: 'UPLOAD_ERROR'
              });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: err.message,
            error: 'FILE_VALIDATION_ERROR'
          });
        }
      }
      
      next();
    });
  };
};

/**
 * Specific middleware for book uploads
 */
export const uploadBookFile = uploadSingleFile('book');
export const uploadCoverImage = uploadSingleFile('cover');
export const uploadAdvertisementImage = uploadSingleFile('image');

/**
 * Middleware for book with cover (both files)
 */
export const uploadBookWithCover = uploadMixedFiles([
  { name: 'book', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

/**
 * Error handling middleware for file uploads
 */
export const handleFileUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.code,
      details: err.message
    });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  next(err);
};

// Export the configured upload instances
export { upload, uploadMemory, uploadDisk };
export default upload;