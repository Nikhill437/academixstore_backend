import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  requireAdmin, 
  requireBookAccess, 
  requireRoles 
} from '../middleware/rbac.js';
import { 
  uploadBookFile, 
  uploadCoverImage, 
  uploadBookWithCover,
  handleFileUploadErrors 
} from '../middleware/fileUpload.js';
import bookController from '../controllers/bookController.js';

const router = express.Router();

/**
 * Diagnostic routes
 */

// Test S3 URL generation (for debugging)
router.get('/debug/test-s3-url', authenticateToken, async (req, res) => {
  try {
    const { extractS3Key, generateSignedUrl, generatePublicUrl, isS3Configured } = await import('../config/aws.js');
    
    const testUrl = req.query.url || 'https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/test.jpg';
    
    const result = {
      s3_configured: isS3Configured(),
      test_url: testUrl,
      extracted_key: null,
      signed_url: null,
      public_url: null,
      error: null
    };
    
    try {
      result.extracted_key = extractS3Key(testUrl);
      
      if (result.extracted_key) {
        try {
          result.signed_url = generateSignedUrl(result.extracted_key, 3600);
        } catch (e) {
          result.error = `Signed URL generation failed: ${e.message}`;
        }
        
        try {
          result.public_url = generatePublicUrl(result.extracted_key);
        } catch (e) {
          result.error = `Public URL generation failed: ${e.message}`;
        }
      } else {
        result.error = 'Failed to extract S3 key from URL';
      }
    } catch (e) {
      result.error = e.message;
    }
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

/**
 * Public routes (no authentication required)
 */

// Get public book information (for browsing without login)
// This could be useful for a public catalog
router.get('/public', async (req, res) => {
  // For now, redirect to authenticated route
  res.status(401).json({
    success: false,
    message: 'Authentication required to access books',
    error: 'AUTH_REQUIRED'
  });
});

/**
 * Protected routes (authentication required)
 */

// Get books based on user role and permissions
router.get('/', 
  authenticateToken, 
  (req, res) => bookController.getBooks(req, res)
);


/**
 * Student-specific routes
 */

// Get books for student's year and college
router.get('/my-books', 
  authenticateToken, 
  requireRoles(['student']),
  async (req, res) => {
    // Add student-specific filters to query
    req.query.student_books = true;
    return bookController.getBooks(req, res);
  }
);

/**
 * Individual User routes
 */

// Get books for individual users (all books from all colleges)
router.get('/user-books', 
  authenticateToken, 
  requireRoles(['user']),
  async (req, res) => {
    // Individual users can see all books
    return bookController.getBooks(req, res);
  }
);

// Get single book by ID
router.get('/:bookId', 
  authenticateToken, 
  requireBookAccess,
  (req, res) => bookController.getBook(req, res)
);

// Log book access (view/download tracking)
router.post('/:bookId/access', 
  authenticateToken, 
  requireBookAccess,
  (req, res) => bookController.logBookAccess(req, res)
);

/**
 * Admin/Super Admin only routes
 */

// Create new book
router.post('/', 
  authenticateToken, 
  requireAdmin,
  (req, res) => bookController.createBook(req, res)
);

// Update book information
router.put('/:bookId', 
  authenticateToken, 
  requireAdmin,
  (req, res) => bookController.updateBook(req, res)
);

// Delete book
router.delete('/:bookId', 
  authenticateToken, 
  requireAdmin,
  (req, res) => bookController.deleteBook(req, res)
);

/**
 * File upload routes
 */

// Upload book PDF file
router.post('/:bookId/upload-pdf', 
  authenticateToken, 
  requireAdmin,
  uploadBookFile, // Multer middleware for 'book' field
  handleFileUploadErrors,
  (req, res) => bookController.uploadBookPdf(req, res)
);

// Upload book cover image
router.post('/:bookId/upload-cover', 
  authenticateToken, 
  requireAdmin,
  uploadCoverImage, // Multer middleware for 'cover' field
  handleFileUploadErrors,
  (req, res) => bookController.uploadBookCover(req, res)
);

// Upload both book PDF and cover in one request
router.post('/:bookId/upload-both', 
  authenticateToken, 
  requireAdmin,
  uploadBookWithCover, // Multer middleware for both 'book' and 'cover' fields
  handleFileUploadErrors,
  async (req, res) => {
    try {
      const results = {};
      
      // Upload PDF if provided
      if (req.files && req.files.book && req.files.book[0]) {
        req.file = req.files.book[0]; // Set for controller
        await bookController.uploadBookPdf(req, res);
        return; // Controller sends response
      }
      
      // Upload cover if provided
      if (req.files && req.files.cover && req.files.cover[0]) {
        req.file = req.files.cover[0]; // Set for controller
        await bookController.uploadBookCover(req, res);
        return; // Controller sends response
      }
      
      return res.status(400).json({
        success: false,
        message: 'No files provided. Expected book PDF or cover image.',
        error: 'NO_FILES'
      });
      
    } catch (error) {
      console.error('Upload both files error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: 'UPLOAD_ERROR'
      });
    }
  }
);

/**
 * Search and filtering routes
 */

// Search books by title, author, or description
router.get('/search/:query', 
  authenticateToken,
  async (req, res) => {
    req.query.search = req.params.query;
    return bookController.getBooks(req, res);
  }
);

// Get books by category
router.get('/category/:category', 
  authenticateToken,
  async (req, res) => {
    req.query.category = req.params.category;
    return bookController.getBooks(req, res);
  }
);

// Get books by year and semester (for admins and super admins)
router.get('/year/:year', 
  authenticateToken,
  requireRoles(['super_admin', 'college_admin']),
  async (req, res) => {
    req.query.year = req.params.year;
    return bookController.getBooks(req, res);
  }
);

// Get books by semester (for admins and super admins)
router.get('/semester/:semester', 
  authenticateToken,
  requireRoles(['super_admin', 'college_admin']),
  async (req, res) => {
    req.query.semester = req.params.semester;
    return bookController.getBooks(req, res);
  }
);

// Get books by year and semester combined
router.get('/year/:year/semester/:semester', 
  authenticateToken,
  requireRoles(['super_admin', 'college_admin']),
  async (req, res) => {
    req.query.year = req.params.year;
    req.query.semester = req.params.semester;
    return bookController.getBooks(req, res);
  }
);

/**
 * Analytics routes (Admin/Super Admin only)
 */

// Get book access analytics
router.get('/:bookId/analytics', 
  authenticateToken, 
  requireAdmin,
  async (req, res) => {
    try {
      const { bookId } = req.params;
      const { startDate, endDate } = req.query;
      
      // This would be implemented in a separate analytics controller
      // For now, return a placeholder
      return res.json({
        success: true,
        message: 'Book analytics endpoint - to be implemented',
        data: {
          book_id: bookId,
          total_views: 0,
          total_downloads: 0,
          unique_users: 0
        }
      });
      
    } catch (error) {
      console.error('Book analytics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve book analytics',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Bulk operations (Super Admin only)
 */

// Bulk import books from CSV
router.post('/bulk-import', 
  authenticateToken, 
  requireRoles(['super_admin']),
  async (req, res) => {
    // This would be implemented for bulk book imports
    return res.json({
      success: false,
      message: 'Bulk import endpoint - to be implemented',
      error: 'NOT_IMPLEMENTED'
    });
  }
);

// Error handling for this router
router.use((error, req, res, next) => {
  console.error('Books router error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      error: 'FILE_TOO_LARGE'
    });
  }
  
  if (error.message && error.message.includes('Validation')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'VALIDATION_ERROR'
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Internal server error in books module',
    error: 'SERVER_ERROR'
  });
});

export default router;