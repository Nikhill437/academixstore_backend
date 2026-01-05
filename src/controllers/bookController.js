import { Book, College, User, BookAccessLog, Order } from '../models/index.js';
import { Op } from 'sequelize';
import fileUploadService from '../services/fileUploadService.js';
import { generateSignedUrl, extractS3Key } from '../config/aws.js';

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
        rate,
        rating,
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
      let bookCollegeId = null;
      
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
          bookCollegeId = college_id;
        }
        // If no college_id provided, bookCollegeId remains null (book available to all)
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
        rate: rate ? parseFloat(rate) : 0.0,
        rating: rating ? parseInt(rating) : null,
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
      
      // Provide more detailed error information
      let errorMessage = 'Failed to create book';
      let errorCode = 'SERVER_ERROR';
      
      // Check for database constraint errors
      if (error.name === 'SequelizeValidationError') {
        errorMessage = error.errors.map(e => e.message).join(', ');
        errorCode = 'VALIDATION_ERROR';
      } else if (error.name === 'SequelizeDatabaseError') {
        // Database constraint error - likely the college_id constraint
        if (error.message.includes('college_books_constraint')) {
          errorMessage = 'Database constraint error. Please run the migration to allow books without college_id.';
          errorCode = 'DATABASE_CONSTRAINT_ERROR';
        } else {
          errorMessage = `Database error: ${error.message}`;
          errorCode = 'DATABASE_ERROR';
        }
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

  _generatePdfAccessUrl(pdfUrl, expirySeconds = 3600) {
    if (!pdfUrl) return null;
    
    try {
      // Extract the S3 key from the URL
      const key = pdfUrl.split('/').slice(-2).join('/');
      return generateSignedUrl(key, expirySeconds);
    } catch (error) {
      console.warn('Failed to generate signed URL:', error.message);
      return null;
    }
  }

  /**
   * Helper method to add file URLs (PDFs and cover images) to book data
   * Generates signed URLs for secure, temporary access to S3 files
   */
  _addFileUrlsToBook(book) {
    const bookData = book.toSafeJSON ? book.toSafeJSON() : book.get();
    
    // Generate signed URL for PDF access (valid for 1 hour)
    if (bookData.pdf_url) {
      bookData.pdf_access_url = this._generatePdfAccessUrl(bookData.pdf_url, 3600);
      // Remove direct URL for security
      delete bookData.pdf_url;
    }

    // Generate signed URL for cover image access (valid for 1 hour)
    if (bookData.cover_image_url) {
      try {
        const key = extractS3Key(bookData.cover_image_url);
        if (key) {
          bookData.cover_image_access_url = generateSignedUrl(key, 3600);
          console.log(`✅ Generated signed URL for cover image, book ${bookData.id}, key: ${key}`);
        } else {
          console.error(`❌ Failed to extract S3 key from cover URL: ${bookData.cover_image_url}`);
          // Fallback: try to use the direct URL (will fail if not public)
          bookData.cover_image_access_url = bookData.cover_image_url;
        }
      } catch (error) {
        console.error('❌ Failed to generate cover image signed URL:', error.message);
        // Fallback: try to use the direct URL (will fail if not public)
        bookData.cover_image_access_url = bookData.cover_image_url;
      }
      // Remove direct URL for security
      delete bookData.cover_image_url;
    }

    return bookData;
  }

  /**
   * Helper method to check purchase status for books
   * @param {string} userId - The user ID to check purchases for
   * @param {Array<string>} bookIds - Array of book IDs to check
   * @returns {Promise<Set<string>>} Set of purchased book IDs
   */
  async _checkPurchaseStatus(userId, bookIds) {
    try {
      // If no book IDs provided, return empty set
      if (!bookIds || bookIds.length === 0) {
        return new Set();
      }

      // Query orders table for paid orders in a single query
      const purchasedOrders = await Order.findAll({
        where: {
          user_id: userId,
          book_id: { [Op.in]: bookIds },
          status: 'paid'
        },
        attributes: ['book_id'],
        raw: true
      });

      // Return Set of purchased book IDs for O(1) lookup
      return new Set(purchasedOrders.map(order => order.book_id));
    } catch (error) {
      // Log error but don't fail the request
      console.error('Error checking purchase status:', error);
      console.error('User ID:', userId, 'Book IDs:', bookIds);
      
      // Return empty Set on error (default to not purchased)
      return new Set();
    }
  }

  /**
   * Helper method to add purchased field to book objects
   * @param {Object|Array<Object>} books - Single book object or array of books
   * @param {string} userId - The authenticated user's ID
   * @param {string} userRole - The user's role
   * @returns {Promise<Object|Array<Object>>} Book(s) with purchased field added
   */
  async _addPurchasedField(books, userId, userRole) {
    // Handle both single book and array of books
    const isArray = Array.isArray(books);
    const booksArray = isArray ? books : [books];

    // For non-'user' roles, set purchased = 0 for all books
    if (userRole !== 'user') {
      booksArray.forEach(book => {
        book.purchased = 0;
      });
      return isArray ? booksArray : booksArray[0];
    }

    // For 'user' role, check purchase status
    const bookIds = booksArray.map(book => book.id);
    const purchasedBookIds = await this._checkPurchaseStatus(userId, bookIds);

    // Add purchased field based on purchase status
    booksArray.forEach(book => {
      book.purchased = purchasedBookIds.has(book.id) ? 1 : 0;
    });

    return isArray ? booksArray : booksArray[0];
  }
  /**
   * Get books based on user role and permissions
   */
  async getBooks(req, res) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const userCollegeCode = req.user.collegeId; // This is the college code (STRING)
    const userYear = req.user.year; // Student's year

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
        // Super admin sees all books
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
              books: [],
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
        console.log(`Filtering books for student: college=${studentCollege.code}, year=${userYear}`);
        whereClause.college_id = studentCollege.id;
        whereClause.year = userYear;
        
        includeClause.push({
          model: College,
          as: 'college',
          attributes: ['id', 'name', 'code']
        });
        break;

      case 'user':
        // User role sees all books
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
    if (category) whereClause.category = category;
    if (year) whereClause.year = parseInt(year);
    if (semester) whereClause.semester = parseInt(semester);

    const books = await Book.findAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']]
    });

    // Add signed URLs to all books (PDFs and cover images)
    const booksWithUrls = books.map(book => this._addFileUrlsToBook(book));

    // Add purchased field to all books
    const booksWithPurchased = await this._addPurchasedField(booksWithUrls, userId, userRole);

    return res.json({
      success: true,
      data: {
        books: booksWithPurchased,
        count: booksWithPurchased.length
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve books',
      error: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Add signed URLs for PDF and cover image
    const bookData = this._addFileUrlsToBook(book);

    // Add purchased field
    const bookWithPurchased = await this._addPurchasedField(bookData, userId, userRole);

    return res.json({
      success: true,
      data: {
        book: bookWithPurchased
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
   * Get refreshed PDF access URL (when signed URL expires)
   */
  async refreshPdfAccessUrl(req, res) {
  try {
    const { bookId } = req.params;

    const book = await Book.findByPk(bookId);
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

    if (!book.pdf_url) {
      return res.status(404).json({
        success: false,
        message: 'No PDF available for this book',
        error: 'NO_PDF'
      });
    }

    // Generate new signed URL (valid for 1 hour)
    let pdfAccessUrl = null;
    try {
      const key = book.pdf_url.split('/').slice(-2).join('/');
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
        book_id: bookId,
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