import { QuestionPaper, QuestionPaperAccessLog, College, User } from '../models/index.js';
import { Op } from 'sequelize';
import fileUploadService from '../services/fileUploadService.js';
import { generateSignedUrl, extractS3Key } from '../config/aws.js';

/**
 * Question Paper Controller
 * Handles question paper management with S3 file storage
 */

class QuestionPaperController {
  /**
   * Create a new question paper
   */
  async createQuestionPaper(req, res) {
    try {
      const {
        title,
        description,
        subject,
        year,
        semester,
        exam_type,
        marks,
        college_id // Allow super admin to specify college_id
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      // Validate permissions
      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins and College Admins can create question papers',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Determine which college this question paper belongs to
      let questionPaperCollegeId = null;
      
      if (userRole === 'super_admin') {
        // Super admin can optionally specify college_id in request body
        if (college_id) {
          // Verify the college exists if provided
          const collegeExists = await College.findByPk(college_id);
          if (!collegeExists || !collegeExists.is_active) {
            return res.status(400).json({
              success: false,
              message: 'Invalid or inactive college specified',
              error: 'INVALID_COLLEGE'
            });
          }
          questionPaperCollegeId = college_id;
        }
        // If no college_id provided, questionPaperCollegeId remains null (global question paper)
      } else if (userRole === 'college_admin') {
        // College admin can only create question papers for their own college
        if (!userCollegeId) {
          return res.status(400).json({
            success: false,
            message: 'College admin must be associated with a college',
            error: 'NO_COLLEGE_ASSOCIATION'
          });
        }
        questionPaperCollegeId = userCollegeId;
      }
      
      // Validate required fields
      if (!title || !subject || !year || !semester) {
        return res.status(400).json({
          success: false,
          message: 'Title, subject, year, and semester are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Create question paper record
      const questionPaperData = {
        title,
        description,
        subject,
        year: parseInt(year),
        semester: parseInt(semester),
        exam_type,
        marks: marks ? parseInt(marks) : null,
        college_id: questionPaperCollegeId,
        created_by: userId
      };

      const questionPaper = await QuestionPaper.create(questionPaperData);

      return res.status(201).json({
        success: true,
        message: 'Question paper created successfully',
        data: {
          question_paper: questionPaper.toSafeJSON()
        }
      });

    } catch (error) {
      console.error('Create question paper error:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Failed to create question paper';
      let errorCode = 'SERVER_ERROR';
      
      // Check for database constraint errors
      if (error.name === 'SequelizeValidationError') {
        errorMessage = error.errors.map(e => e.message).join(', ');
        errorCode = 'VALIDATION_ERROR';
      } else if (error.name === 'SequelizeDatabaseError') {
        errorMessage = `Database error: ${error.message}`;
        errorCode = 'DATABASE_ERROR';
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get question papers based on user role and permissions
   */
  async getQuestionPapers(req, res) {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;
      const userCollegeCode = req.user.collegeId; // This is the college code (STRING)
      const userYear = req.user.year; // Student's year

      const { subject, year, semester, exam_type } = req.query;

      let whereClause = { is_active: true };
      let includeClause = [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }
      ];

      // Apply role-based filtering
      switch (userRole) {
        case 'super_admin':
          // Super admin sees all question papers
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        case 'college_admin':
          if (!userCollegeCode) {
            return res.status(400).json({
              success: false,
              message: 'College admin must be associated with a college',
              error: 'NO_COLLEGE_ASSOCIATION'
            });
          }
          
          // Find college UUID from college code
          const adminCollege = await College.findOne({
            where: { code: userCollegeCode, is_active: true }
          });
          
          if (!adminCollege) {
            return res.status(400).json({
              success: false,
              message: 'College not found',
              error: 'COLLEGE_NOT_FOUND'
            });
          }
          
          // Filter by college UUID (all years)
          whereClause.college_id = adminCollege.id;
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        case 'student':
          if (!userCollegeCode) {
            return res.status(400).json({
              success: false,
              message: 'Student must be associated with a college',
              error: 'NO_COLLEGE_ASSOCIATION'
            });
          }
          
          // Check if student has year defined
          if (!userYear) {
            console.log(`Student ${userId} has no year field defined`);
            return res.json({
              success: true,
              data: {
                question_papers: [],
                count: 0,
                message: 'No year information available for student account'
              }
            });
          }
          
          // Find college UUID from college code
          const studentCollege = await College.findOne({
            where: { code: userCollegeCode, is_active: true }
          });
          
          if (!studentCollege) {
            console.log(`College not found for code: ${userCollegeCode}`);
            return res.status(400).json({
              success: false,
              message: 'College not found',
              error: 'COLLEGE_NOT_FOUND'
            });
          }
          
          // Filter by college UUID AND year
          console.log(`Filtering question papers for student: college=${studentCollege.code}, year=${userYear}`);
          whereClause.college_id = studentCollege.id;
          whereClause.year = userYear;
          
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        case 'user':
          // User role sees all question papers
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        default:
          return res.status(403).json({
            success: false,
            message: 'Access denied',
            error: 'INSUFFICIENT_PERMISSIONS'
          });
      }

      // Add filters
      if (subject) whereClause.subject = subject;
      if (year) whereClause.year = parseInt(year);
      if (semester) whereClause.semester = parseInt(semester);
      if (exam_type) whereClause.exam_type = exam_type;

      const questionPapers = await QuestionPaper.findAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']]
      });

      // Add signed URLs to all question papers
      const questionPapersWithUrls = questionPapers.map(qp => this._addFileUrlsToQuestionPaper(qp));

      return res.json({
        success: true,
        data: {
          question_papers: questionPapersWithUrls,
          count: questionPapersWithUrls.length
        }
      });

    } catch (error) {
      console.error('Get question papers error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve question papers',
        error: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get single question paper by ID
   */
  async getQuestionPaper(req, res) {
    try {
      const { questionPaperId } = req.params;

      const questionPaper = await QuestionPaper.findByPk(questionPaperId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      // Check access permissions
      if (!questionPaper.isAccessibleBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      // Add signed URL for PDF
      const questionPaperData = this._addFileUrlsToQuestionPaper(questionPaper);

      return res.json({
        success: true,
        data: {
          question_paper: questionPaperData
        }
      });

    } catch (error) {
      console.error('Get question paper error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve question paper',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Update question paper information
   */
  async updateQuestionPaper(req, res) {
    try {
      const { questionPaperId } = req.params;
      const updates = req.body;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      const questionPaper = await QuestionPaper.findByPk(questionPaperId);
      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      // Check permissions
      if (userRole === 'college_admin' && questionPaper.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update question papers',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Filter allowed updates
      const allowedUpdates = [
        'title', 'description', 'subject', 'year', 'semester', 
        'exam_type', 'marks'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      await questionPaper.update(filteredUpdates);

      return res.json({
        success: true,
        message: 'Question paper updated successfully',
        data: {
          question_paper: questionPaper.toSafeJSON()
        }
      });

    } catch (error) {
      console.error('Update question paper error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update question paper',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Delete question paper
   */
  async deleteQuestionPaper(req, res) {
    try {
      const { questionPaperId } = req.params;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      const questionPaper = await QuestionPaper.findByPk(questionPaperId);
      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      // Check permissions
      if (userRole === 'college_admin' && questionPaper.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete question papers',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete file from S3 if exists
      if (questionPaper.pdf_url) {
        try {
          const key = extractS3Key(questionPaper.pdf_url);
          if (key) {
            await fileUploadService.deleteFile(key);
          }
        } catch (deleteError) {
          console.warn(`Failed to delete S3 file:`, deleteError.message);
        }
      }

      // Soft delete the question paper (set is_active to false)
      await questionPaper.update({ is_active: false });

      return res.json({
        success: true,
        message: 'Question paper deleted successfully'
      });

    } catch (error) {
      console.error('Delete question paper error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete question paper',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Helper method to add file URLs to question paper data
   * Generates signed URLs for secure, temporary access to S3 files
   */
  _addFileUrlsToQuestionPaper(questionPaper) {
    const questionPaperData = questionPaper.toSafeJSON ? questionPaper.toSafeJSON() : questionPaper.get();
    
    // Generate signed URL for PDF access (valid for 1 hour)
    if (questionPaperData.pdf_url) {
      questionPaperData.pdf_access_url = this._generatePdfAccessUrl(questionPaperData.pdf_url, 3600);
      // Remove direct URL for security
      delete questionPaperData.pdf_url;
    }

    return questionPaperData;
  }

  /**
   * Helper method to generate PDF access URL
   */
  _generatePdfAccessUrl(pdfUrl, expirySeconds = 3600) {
    if (!pdfUrl) return null;
    
    try {
      // Extract the S3 key from the URL using the proper extraction function
      const key = extractS3Key(pdfUrl);
      if (!key) {
        console.error('Failed to extract S3 key from PDF URL:', pdfUrl);
        return null;
      }
      return generateSignedUrl(key, expirySeconds);
    } catch (error) {
      console.warn('Failed to generate signed URL:', error.message);
      return null;
    }
  }

  /**
   * Upload question paper PDF file
   */
  async uploadQuestionPaperPdf(req, res) {
    try {
      const { questionPaperId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No PDF file provided',
          error: 'NO_FILE'
        });
      }

      // Find the question paper
      const questionPaper = await QuestionPaper.findByPk(questionPaperId);
      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      if (userRole === 'college_admin' && questionPaper.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload question paper files',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete old PDF if exists
      if (questionPaper.pdf_url) {
        try {
          // Extract key from URL
          const oldKey = extractS3Key(questionPaper.pdf_url);
          if (oldKey) {
            await fileUploadService.deleteFile(oldKey);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old PDF:', deleteError.message);
        }
      }

      // Upload new PDF to S3
      const uploadResult = await fileUploadService.uploadQuestionPaperPdf(file, questionPaperId);

      // Update question paper record with S3 URL
      await questionPaper.update({
        pdf_url: uploadResult.publicUrl
      });

      return res.json({
        success: true,
        message: 'Question paper PDF uploaded successfully',
        data: {
          question_paper_id: questionPaperId,
          pdf_url: uploadResult.publicUrl,
          signed_url: uploadResult.signedUrl,
          original_name: uploadResult.originalName
        }
      });

    } catch (error) {
      console.error('Upload question paper PDF error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload question paper PDF',
        error: 'UPLOAD_ERROR',
        details: error.message
      });
    }
  }

  /**
   * Get refreshed PDF access URL (when signed URL expires)
   */
  async refreshPdfAccessUrl(req, res) {
    try {
      const { questionPaperId } = req.params;

      const questionPaper = await QuestionPaper.findByPk(questionPaperId);
      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      // Check access permissions
      if (!questionPaper.isAccessibleBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      if (!questionPaper.pdf_url) {
        return res.status(404).json({
          success: false,
          message: 'No PDF available for this question paper',
          error: 'NO_PDF'
        });
      }

      // Generate new signed URL (valid for 1 hour)
      let pdfAccessUrl = null;
      try {
        const key = extractS3Key(questionPaper.pdf_url);
        if (!key) {
          console.error('Failed to extract S3 key from PDF URL:', questionPaper.pdf_url);
          return res.status(500).json({
            success: false,
            message: 'Failed to extract S3 key from PDF URL',
            error: 'INVALID_PDF_URL'
          });
        }
        pdfAccessUrl = generateSignedUrl(key, 3600);
      } catch (error) {
        console.warn('Failed to generate signed URL:', error.message);
      }

      if (!pdfAccessUrl) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate access URL',
          error: 'URL_GENERATION_FAILED'
        });
      }

      return res.json({
        success: true,
        data: {
          question_paper_id: questionPaperId,
          pdf_access_url: pdfAccessUrl,
          expires_in: 3600
        }
      });

    } catch (error) {
      console.error('Refresh PDF URL error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refresh PDF access URL',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Log question paper access (for analytics)
   */
  async logQuestionPaperAccess(req, res) {
    try {
      const { questionPaperId } = req.params;
      const { access_type = 'view' } = req.body;
      const userId = req.user.id;

      // Verify question paper exists and user has access
      const questionPaper = await QuestionPaper.findByPk(questionPaperId);
      if (!questionPaper) {
        return res.status(404).json({
          success: false,
          message: 'Question paper not found',
          error: 'QUESTION_PAPER_NOT_FOUND'
        });
      }

      if (!questionPaper.isAccessibleBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this question paper',
          error: 'ACCESS_DENIED'
        });
      }

      // Log the access
      await QuestionPaperAccessLog.create({
        user_id: userId,
        question_paper_id: questionPaperId,
        access_type: access_type,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      return res.json({
        success: true,
        message: 'Question paper access logged successfully'
      });

    } catch (error) {
      console.error('Log question paper access error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to log question paper access',
        error: 'SERVER_ERROR'
      });
    }
  }
}

export default new QuestionPaperController();
