import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`Missing AWS environment variables: ${missingVars.join(', ')}`);
  console.warn('S3 functionality will be limited until these are configured.');
}

// AWS Configuration
const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET,
  // Optional: Custom endpoint for LocalStack or other S3-compatible services
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  // Force path style for LocalStack compatibility
  s3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true' || false
};

// Configure AWS SDK
AWS.config.update({
  accessKeyId: awsConfig.accessKeyId,
  secretAccessKey: awsConfig.secretAccessKey,
  region: awsConfig.region
});

// Create S3 instance
const s3Config = {
  apiVersion: '2006-03-01',
  region: awsConfig.region
};

// Add custom endpoint and path style if specified (for LocalStack/MinIO)
if (awsConfig.endpoint) {
  s3Config.endpoint = awsConfig.endpoint;
  s3Config.s3ForcePathStyle = awsConfig.s3ForcePathStyle;
}

const s3 = new AWS.S3(s3Config);

// S3 Bucket Configuration
export const S3_CONFIG = {
  bucket: awsConfig.bucket,
  region: awsConfig.region,
  
  // File paths within bucket
  paths: {
    books: 'books/pdfs/',
    covers: 'books/covers/',
    advertisements: 'ads/images/',
    temp: 'temp/'
  },
  
  // File size limits (in bytes)
  limits: {
    bookPdf: 100 * 1024 * 1024, // 100MB
    coverImage: 5 * 1024 * 1024, // 5MB
    adImage: 2 * 1024 * 1024      // 2MB
  },
  
  // Allowed file types
  allowedTypes: {
    bookPdf: ['application/pdf'],
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  },
  
  // CDN/CloudFront configuration (optional)
  cdnDomain: process.env.AWS_CLOUDFRONT_DOMAIN || null
};

// Export configured S3 instance
export { s3 };

// Utility function to check if S3 is properly configured
export const isS3Configured = () => {
  return !!(awsConfig.accessKeyId && 
           awsConfig.secretAccessKey && 
           awsConfig.region && 
           awsConfig.bucket);
};

// Test S3 connection
export const testS3Connection = async () => {
  if (!isS3Configured()) {
    throw new Error('S3 is not properly configured');
  }

  try {
    // Test by listing objects in the bucket (this also verifies permissions)
    await s3.headBucket({ Bucket: awsConfig.bucket }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      throw new Error(`S3 bucket '${awsConfig.bucket}' does not exist`);
    } else if (error.code === 'Forbidden') {
      throw new Error(`Access denied to S3 bucket '${awsConfig.bucket}'`);
    } else {
      throw new Error(`S3 connection failed: ${error.message}`);
    }
  }
};

// Generate signed URL for file access
export const generateSignedUrl = (key, expiresIn = 3600) => {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured');
  }

  return s3.getSignedUrl('getObject', {
    Bucket: awsConfig.bucket,
    Key: key,
    Expires: expiresIn // URL expires in seconds (default: 1 hour)
  });
};

// Generate public URL (for public buckets or CloudFront)
export const generatePublicUrl = (key) => {
  if (S3_CONFIG.cdnDomain) {
    return `https://${S3_CONFIG.cdnDomain}/${key}`;
  }
  
  // Standard S3 URL format
  return `https://${awsConfig.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`;
};

/**
 * Extract S3 key from a full S3 URL
 * 
 * Supports multiple S3 URL formats:
 * - Virtual-hosted-style: https://bucket-name.s3.region.amazonaws.com/path/to/file.pdf
 * - Path-style: https://s3.region.amazonaws.com/bucket-name/path/to/file.pdf
 * - Legacy format: https://s3.amazonaws.com/bucket-name/path/to/file.pdf
 * 
 * @param {string} url - Full S3 URL
 * @returns {string|null} - Extracted S3 key (object path) or null if invalid
 * 
 * @example
 * // Virtual-hosted-style URL
 * extractS3Key('https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf')
 * // Returns: 'folder/file.pdf'
 * 
 * @example
 * // Path-style URL
 * extractS3Key('https://s3.us-east-1.amazonaws.com/mybucket/folder/file.pdf')
 * // Returns: 'folder/file.pdf'
 * 
 * @example
 * // URL with query parameters (pre-signed URL)
 * extractS3Key('https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf?X-Amz-Algorithm=...')
 * // Returns: 'folder/file.pdf'
 */
export const extractS3Key = (url) => {
  // Handle null, undefined, or non-string inputs
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Get the pathname and remove leading slash
    let pathname = urlObj.pathname;
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }

    // If pathname is empty or just whitespace, return null
    if (!pathname || pathname.trim() === '') {
      return null;
    }

    // Decode URL-encoded characters
    pathname = decodeURIComponent(pathname);

    // Check if this is a path-style URL (hostname contains s3 but not bucket name)
    // Path-style format: s3.region.amazonaws.com/bucket-name/key or s3.amazonaws.com/bucket-name/key
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.startsWith('s3.') || hostname === 's3.amazonaws.com') {
      // Path-style URL: first segment is bucket name, rest is the key
      const segments = pathname.split('/');
      if (segments.length < 2) {
        // Invalid path-style URL (no key after bucket name)
        return null;
      }
      // Remove the bucket name (first segment) and return the rest as the key
      const key = segments.slice(1).join('/');
      // Check if key is empty or just whitespace
      if (!key || key.trim() === '') {
        return null;
      }
      return key;
    }
    
    // Virtual-hosted-style URL: entire pathname is the key
    // Format: bucket-name.s3.region.amazonaws.com/key
    if (hostname.includes('.s3.') || hostname.includes('.s3-')) {
      return pathname;
    }

    // If we can't determine the format, return null
    return null;

  } catch (error) {
    // Invalid URL format
    console.warn('Failed to parse S3 URL:', url, error.message);
    return null;
  }
};

export default { s3, S3_CONFIG, isS3Configured, testS3Connection, extractS3Key };