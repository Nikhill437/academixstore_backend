import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireRoles } from '../middleware/rbac.js';
import { uploadQuestionPaperFile, handleFileUploadErrors } from '../middleware/fileUpload.js';
import questionPaperController from '../controllers/questionPaperController.js';

const router = express.Router();

/**
 * Protected routes (authentication required)
 */

// Get question papers based on user role and permissions
router.get('/', 
  authenticateToken, 
  (req, res) => questionPaperController.getQuestionPapers(req, res)
);

// Get single question paper by ID
router.get('/:questionPaperId', 
  authenticateToken,
  (req, res) => questionPaperController.getQuestionPaper(req, res)
);

// Refresh PDF access URL (when signed URL expires)
router.get('/:questionPaperId/refresh-url', 
  authenticateToken,
  (req, res) => questionPaperController.refreshPdfAccessUrl(req, res)
);

// Log question paper access (view/download tracking)
router.post('/:questionPaperId/access', 
  authenticateToken,
  (req, res) => questionPaperController.logQuestionPaperAccess(req, res)
);

/**
 * Admin/Super Admin only routes
 */

// Create new question paper
router.post('/', 
  authenticateToken, 
  requireAdmin,
  (req, res) => questionPaperController.createQuestionPaper(req, res)
);

// Update question paper information
router.put('/:questionPaperId', 
  authenticateToken, 
  requireAdmin,
  (req, res) => questionPaperController.updateQuestionPaper(req, res)
);

// Delete question paper
router.delete('/:questionPaperId', 
  authenticateToken, 
  requireAdmin,
  (req, res) => questionPaperController.deleteQuestionPaper(req, res)
);

/**
 * File upload routes
 */

// Upload question paper PDF file
router.post('/:questionPaperId/upload-pdf', 
  authenticateToken, 
  requireAdmin,
  uploadQuestionPaperFile, // Multer middleware for 'question_paper' field
  handleFileUploadErrors,
  (req, res) => questionPaperController.uploadQuestionPaperPdf(req, res)
);

/**
 * Search and filtering routes
 */

// Get question papers by subject
router.get('/subject/:subject', 
  authenticateToken,
  async (req, res) => {
    req.query.subject = req.params.subject;
    return questionPaperController.getQuestionPapers(req, res);
  }
);

// Get question papers by year
router.get('/year/:year', 
  authenticateToken,
  requireRoles(['super_admin', 'college_admin']),
  async (req, res) => {
    req.query.year = req.params.year;
    return questionPaperController.getQuestionPapers(req, res);
  }
);

// Get question papers by semester
router.get('/semester/:semester', 
  authenticateToken,
  requireRoles(['super_admin', 'college_admin']),
  async (req, res) => {
    req.query.semester = req.params.semester;
    return questionPaperController.getQuestionPapers(req, res);
  }
);

// Get question papers by exam type
router.get('/exam-type/:examType', 
  authenticateToken,
  async (req, res) => {
    req.query.exam_type = req.params.examType;
    return questionPaperController.getQuestionPapers(req, res);
  }
);

// Error handling for this router
router.use((error, req, res, next) => {
  console.error('Question papers router error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 50MB.',
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
    message: 'Internal server error in question papers module',
    error: 'SERVER_ERROR'
  });
});

export default router;
