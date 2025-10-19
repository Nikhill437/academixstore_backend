import { Book, College, User, BookAccessLog } from '../models/index.js';
import { Op } from 'sequelize';
import fileUploadService from '../services/fileUploadService.js';
import { generateSignedUrl } from '../config/aws.js';

/**
 * Book Controller
 * Handles book management with S3 file storage
 */

class BookController {
  /**
   * Create a new book
   */
  async createBook(req, res) {
    try {
      const {
        name,
        description,
        authorname,
        isbn,
        publisher,
        publication_year,
        category,
        subject,
        language = 'English',
        year,
        semester,
        pages,
        college_id // Allow super admin to specify college_id
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      // Validate permissions
      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins and College Admins can create books',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Determine which college this book belongs to
      let bookCollegeId;
      
      if (userRole === 'super_admin') {
        // Super admin must specify college_id in request body
        if (!college_id) {
          return res.status(400).json({
            success: false,
            message: 'Super admin must specify college_id for the book',
            error: 'COLLEGE_ID_REQUIRED'
          });
        }
        
        // Verify the college exists
        const collegeExists = await College.findByPk(college_id);
        if (!collegeExists || !collegeExists.is_active) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive college specified',
            error: 'INVALID_COLLEGE'
          });
        }
        
        bookCollegeId = college_id;
      } else if (userRole === 'college_admin') {
        // College admin can only create books for their own college
        if (!userCollegeId) {
          return res.status(400).json({
            success: false,
            message: 'College admin must be associated with a college',
            error: 'NO_COLLEGE_ASSOCIATION'
          });
        }
        bookCollegeId = userCollegeId;
      }
      
      // Ensure year and semester are provided for all books
      if (!year || !semester) {
        return res.status(400).json({
          success: false,
          message: 'Year and semester are required for all books',
          error: 'YEAR_SEMESTER_REQUIRED'
        });
      }

      // Create book record
      const bookData = {
        name,
        description,
        authorname,
        isbn,
        publisher,
        publication_year: publication_year ? parseInt(publication_year) : null,
        category,
        subject,
        language,
        year: parseInt(year),
        semester: parseInt(semester),
        pages: pages ? parseInt(pages) : null,
        college_id: bookCollegeId,
        created_by: userId,
        rate: 0.0,
        download_count: 0
      };

      const book = await Book.create(bookData);

      return res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: {
          book: book.toSafeJSON()
        }
      });

    } catch (error) {
      console.error('Create book error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create book',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Upload book PDF file
   */
  async uploadBookPdf(req, res) {
    try {
      const { bookId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No PDF file provided',
          error: 'NO_FILE'
        });
      }

      // Find the book
      const book = await Book.findByPk(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const userId = req.user.id;
      const userCollegeId = req.user.collegeId;

      if (userRole === 'college_admin' && book.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload book files',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete old PDF if exists
      if (book.pdf_url) {
        try {
          // Extract key from URL
          const oldKey = book.pdf_url.split('/').slice(-2).join('/'); // Get last two parts
          await fileUploadService.deleteFile(oldKey);
        } catch (deleteError) {
          console.warn('Failed to delete old PDF:', deleteError.message);
        }
      }

      // Upload new PDF to S3
      const uploadResult = await fileUploadService.uploadBookPdf(file, bookId);

      // Update book record with S3 URL
      await book.update({
        pdf_url: uploadResult.publicUrl
      });

      return res.json({
        success: true,
        message: 'Book PDF uploaded successfully',
        data: {
          book_id: bookId,
          pdf_url: uploadResult.publicUrl,
          signed_url: uploadResult.signedUrl,
          original_name: uploadResult.originalName
        }
      });

    } catch (error) {
      console.error('Upload book PDF error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload book PDF',
        error: 'UPLOAD_ERROR',
        details: error.message
      });
    }
  }

  /**
   * Upload book cover image
   */
  async uploadBookCover(req, res) {
    try {
      const { bookId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No cover image provided',
          error: 'NO_FILE'
        });
      }

      // Find the book
      const book = await Book.findByPk(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      if (userRole === 'college_admin' && book.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload book covers',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete old cover if exists
      if (book.cover_image_url) {
        try {
          const oldKey = book.cover_image_url.split('/').slice(-2).join('/');
          await fileUploadService.deleteFile(oldKey);
        } catch (deleteError) {
          console.warn('Failed to delete old cover:', deleteError.message);
        }
      }

      // Upload new cover to S3
      const uploadResult = await fileUploadService.uploadBookCover(file, bookId);

      // Update book record
      await book.update({
        cover_image_url: uploadResult.publicUrl
      });

      return res.json({
        success: true,
        message: 'Book cover uploaded successfully',
        data: {
          book_id: bookId,
          cover_image_url: uploadResult.publicUrl,
          original_name: uploadResult.originalName
        }
      });

    } catch (error) {
      console.error('Upload book cover error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload book cover',
        error: 'UPLOAD_ERROR',
        details: error.message
      });
    }
  }

  /**
   * Get books based on user role and permissions
   */
  async getBooks(req, res) {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;
      const userCollegeId = req.user.collegeId;

      const { category, year, semester } = req.query;

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
          // Super admin can see all books
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        case 'college_admin':
          // College admin can see books from their college
          if (!userCollegeId) {
            return res.status(400).json({
              success: false,
              message: 'College admin must be associated with a college',
              error: 'NO_COLLEGE_ASSOCIATION'
            });
          }
          whereClause.college_id = userCollegeId;
          includeClause.push({
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          });
          break;

        case 'student':
          // Students can see books in their college
          if (!userCollegeId) {
            return res.status(400).json({
              success: false,
              message: 'Student must be associated with a college',
              error: 'NO_COLLEGE_ASSOCIATION'
            });
          }
          whereClause.college_id = userCollegeId;
          break;

        case 'user':
          // Regular users can see all books from all colleges
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

      // Add category filter
      if (category) {
        whereClause.category = category;
      }

      // Add year filter
      if (year) {
        whereClause.year = parseInt(year);
      }

      // Add semester filter
      if (semester) {
        whereClause.semester = parseInt(semester);
      }

      const books = await Book.findAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']]
      });

      // Generate signed URLs for students accessing PDFs
      const booksWithUrls = books.map(book => {
        const bookData = book.toSafeJSON();
        
        // Generate signed URL for PDF access for students and users
        if (bookData.pdf_url && (userRole === 'student' || userRole === 'user')) {
          try {
            const key = bookData.pdf_url.split('/').slice(-2).join('/');
            bookData.pdf_access_url = generateSignedUrl(key, 3600); // 1 hour expiry
          } catch (error) {
            console.warn('Failed to generate signed URL:', error.message);
          }
        }

        return bookData;
      });

      return res.json({
        success: true,
        data: {
          books: booksWithUrls
        }
      });

    } catch (error) {
      console.error('Get books error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve books',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Get single book by ID
   */
  async getBook(req, res) {
    try {
      const { bookId } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;
      const userCollegeId = req.user.collegeId;

      const book = await Book.findByPk(bookId, {
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

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      // Check access permissions
      if (!book.isAccessibleBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      const bookData = book.toSafeJSON();

      // Generate signed URL for PDF access
      if (bookData.pdf_url && (userRole === 'student' || userRole === 'user')) {
        try {
          const key = bookData.pdf_url.split('/').slice(-2).join('/');
          bookData.pdf_access_url = generateSignedUrl(key, 3600);
        } catch (error) {
          console.warn('Failed to generate signed URL:', error.message);
        }
      }

      return res.json({
        success: true,
        data: {
          book: bookData
        }
      });

    } catch (error) {
      console.error('Get book error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve book',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Log book access (for analytics)
   */
  async logBookAccess(req, res) {
    try {
      const { bookId } = req.params;
      const { access_type = 'view' } = req.body;
      const userId = req.user.id;

      // Verify book exists and user has access
      const book = await Book.findByPk(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      if (!book.isAccessibleBy(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      // Log the access
      await BookAccessLog.create({
        user_id: userId,
        book_id: bookId,
        access_type: access_type,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      return res.json({
        success: true,
        message: 'Book access logged successfully'
      });

    } catch (error) {
      console.error('Log book access error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to log book access',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Update book information
   */
  async updateBook(req, res) {
    try {
      const { bookId } = req.params;
      const updates = req.body;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      const book = await Book.findByPk(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      // Check permissions
      if (userRole === 'college_admin' && book.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update books',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Filter allowed updates
      const allowedUpdates = [
        'name', 'description', 'authorname', 'isbn', 'publisher', 
        'publication_year', 'category', 'subject', 'language', 
        'year', 'semester', 'pages', 'rate'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      await book.update(filteredUpdates);

      return res.json({
        success: true,
        message: 'Book updated successfully',
        data: {
          book: book.toSafeJSON()
        }
      });

    } catch (error) {
      console.error('Update book error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update book',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Delete book
   */
  async deleteBook(req, res) {
    try {
      const { bookId } = req.params;
      const userRole = req.user.role;
      const userCollegeId = req.user.collegeId;

      const book = await Book.findByPk(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
          error: 'BOOK_NOT_FOUND'
        });
      }

      // Check permissions
      if (userRole === 'college_admin' && book.college_id !== userCollegeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this book',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete books',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete files from S3
      const filesToDelete = [];
      if (book.pdf_url) {
        filesToDelete.push(book.pdf_url.split('/').slice(-2).join('/'));
      }
      if (book.cover_image_url) {
        filesToDelete.push(book.cover_image_url.split('/').slice(-2).join('/'));
      }

      // Delete files from S3 (don't fail if deletion fails)
      for (const key of filesToDelete) {
        try {
          await fileUploadService.deleteFile(key);
        } catch (deleteError) {
          console.warn(`Failed to delete S3 file ${key}:`, deleteError.message);
        }
      }

      // Soft delete the book (set is_active to false)
      await book.update({ is_active: false });

      return res.json({
        success: true,
        message: 'Book deleted successfully'
      });

    } catch (error) {
      console.error('Delete book error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete book',
        error: 'SERVER_ERROR'
      });
    }
  }
}

export default new BookController();