import { s3, S3_CONFIG, isS3Configured, generatePublicUrl, generateSignedUrl } from '../config/aws.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

/**
 * File Upload Service for AWS S3
 * Handles uploading books, covers, and advertisement images
 */

class FileUploadService {
  constructor() {
    this.bucket = S3_CONFIG.bucket;
    this.isConfigured = isS3Configured();
  }

  /**
   * Validate file before upload
   */
  validateFile(file, fileType) {
    if (!file) {
      throw new Error('No file provided');
    }

    const { mimetype, size } = file;
    
    // Check file type
    let allowedTypes;
    let maxSize;
    
    switch (fileType) {
      case 'book':
        allowedTypes = S3_CONFIG.allowedTypes.bookPdf;
        maxSize = S3_CONFIG.limits.bookPdf;
        break;
      case 'cover':
      case 'advertisement':
        allowedTypes = S3_CONFIG.allowedTypes.images;
        maxSize = fileType === 'cover' ? S3_CONFIG.limits.coverImage : S3_CONFIG.limits.adImage;
        break;
      default:
        throw new Error('Invalid file type specified');
    }

    // Validate MIME type
    if (!allowedTypes.includes(mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
    }

    return true;
  }

  /**
   * Generate unique file key for S3
   */
  generateFileKey(originalName, fileType, additionalPath = '') {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const fileName = `${timestamp}-${uuid}${ext}`;
    
    let basePath;
    switch (fileType) {
      case 'book':
        basePath = S3_CONFIG.paths.books;
        break;
      case 'cover':
        basePath = S3_CONFIG.paths.covers;
        break;
      case 'advertisement':
        basePath = S3_CONFIG.paths.advertisements;
        break;
      default:
        basePath = S3_CONFIG.paths.temp;
    }

    return `${basePath}${additionalPath}${fileName}`;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(file, fileType, additionalPath = '') {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    // Validate file
    this.validateFile(file, fileType);

    // Generate unique key
    const key = this.generateFileKey(file.originalname, fileType, additionalPath);

    try {
      let fileBuffer;
      
      // Handle different file input types
      if (file.buffer) {
        // Multer memory storage
        fileBuffer = file.buffer;
      } else if (file.path) {
        // Multer disk storage
        fileBuffer = fs.readFileSync(file.path);
        // Clean up temp file
        fs.unlinkSync(file.path);
      } else {
        throw new Error('Invalid file format');
      }

      // Upload parameters
      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype,
        // Set appropriate metadata
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          fileType: fileType
        }
      };

      // Note: ACL is not set here because the bucket uses bucket policies instead
      // Cover images and advertisements will be publicly accessible via bucket policy
      // PDFs remain private and require signed URLs

      // Upload to S3
      const result = await s3.upload(uploadParams).promise();

      return {
        key: result.Key,
        location: result.Location,
        bucket: result.Bucket,
        size: file.size,
        contentType: file.mimetype,
        originalName: file.originalname,
        // Generate URLs
        publicUrl: generatePublicUrl(result.Key),
        signedUrl: fileType === 'book' ? generateSignedUrl(result.Key, 3600) : null
      };

    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload book PDF
   */
  async uploadBookPdf(file, bookId = null) {
    const additionalPath = bookId ? `${bookId}/` : '';
    return this.uploadFile(file, 'book', additionalPath);
  }

  /**
   * Upload book cover image
   */
  async uploadBookCover(file, bookId = null) {
    const additionalPath = bookId ? `${bookId}/` : '';
    return this.uploadFile(file, 'cover', additionalPath);
  }

  /**
   * Upload advertisement image
   */
  async uploadAdvertisementImage(file, adId = null) {
    const additionalPath = adId ? `${adId}/` : '';
    return this.uploadFile(file, 'advertisement', additionalPath);
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key) {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    try {
      const deleteParams = {
        Bucket: this.bucket,
        Key: key
      };

      await s3.deleteObject(deleteParams).promise();
      return true;
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file info from S3
   */
  async getFileInfo(key) {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };

      const result = await s3.headObject(params).promise();
      
      return {
        key: key,
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        metadata: result.Metadata
      };
    } catch (error) {
      if (error.code === 'NotFound') {
        throw new Error('File not found');
      }
      throw new Error(`Error getting file info: ${error.message}`);
    }
  }

  /**
   * Generate new signed URL for existing file
   */
  getSignedUrl(key, expiresIn = 3600) {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    return generateSignedUrl(key, expiresIn);
  }

  /**
   * Generate public URL for existing file
   */
  getPublicUrl(key) {
    return generatePublicUrl(key);
  }

  /**
   * Copy file within S3 bucket
   */
  async copyFile(sourceKey, destinationKey) {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    try {
      const copyParams = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey
      };

      const result = await s3.copyObject(copyParams).promise();
      return {
        key: destinationKey,
        publicUrl: generatePublicUrl(destinationKey)
      };
    } catch (error) {
      console.error('S3 copy error:', error);
      throw new Error(`File copy failed: ${error.message}`);
    }
  }

  /**
   * List files in a specific path
   */
  async listFiles(prefix, maxKeys = 100) {
    if (!this.isConfigured) {
      throw new Error('AWS S3 is not configured');
    }

    try {
      const listParams = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await s3.listObjectsV2(listParams).promise();
      
      return {
        files: result.Contents.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          publicUrl: generatePublicUrl(obj.Key)
        })),
        hasMore: result.IsTruncated,
        nextToken: result.NextContinuationToken
      };
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error(`Error listing files: ${error.message}`);
    }
  }
}

// Export singleton instance
const fileUploadService = new FileUploadService();
export default fileUploadService;