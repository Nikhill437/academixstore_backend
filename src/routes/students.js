import express from 'express';
import { Op } from 'sequelize';
import { User, Book, UserSubscription, BookAccessLog, College, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get student dashboard data
router.get('/dashboard', requireRoles(['student']), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get active subscriptions
    const activeSubscriptions = await UserSubscription.findAll({
      where: { 
        user_id: userId, 
        status: 'active',
        end_date: { [Op.gte]: new Date() }
      },
      include: ['plan']
    });

    // Get recent book access logs
    const recentBooks = await BookAccessLog.findAll({
      where: { user_id: userId },
      include: [{
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'cover_image']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Get college books count
    const user = await User.findByPk(userId, { include: ['college'] });
    const availableBooks = await Book.count({
      where: { 
        college_id: user.college_id,
        is_active: true
      }
    });

    res.json({
      success: true,
      data: {
        activeSubscriptions,
        recentBooks,
        availableBooks,
        college: user.college
      }
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: 'DASHBOARD_LOAD_FAILED'
    });
  }
});

// Get student's subscription history
router.get('/subscriptions', requireRoles(['student']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const subscriptions = await UserSubscription.findAndCountAll({
      where: { user_id: userId },
      include: ['plan'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.rows,
        pagination: {
          total: subscriptions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(subscriptions.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
      error: 'SUBSCRIPTIONS_FETCH_FAILED'
    });
  }
});

// Get student's book access history
router.get('/book-history', requireRoles(['student']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bookHistory = await BookAccessLog.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'author', 'cover_image', 'category']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        history: bookHistory.rows,
        pagination: {
          total: bookHistory.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(bookHistory.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get book history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get book history',
      error: 'BOOK_HISTORY_FETCH_FAILED'
    });
  }
});

// Get available books for student's college
router.get('/books', requireRoles(['student']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, category, search, year } = req.query;
    const offset = (page - 1) * limit;

    // Get user's college
    const user = await User.findByPk(userId);
    if (!user.college_id) {
      return res.status(400).json({
        success: false,
        message: 'Student not associated with any college',
        error: 'NO_COLLEGE_ASSOCIATION'
      });
    }

    const whereClause = { 
      college_id: user.college_id, 
      is_active: true 
    };

    if (category) whereClause.category = category;
    if (year) whereClause.academic_year = year;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const books = await Book.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['file_path', 'file_size'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        books: books.rows,
        pagination: {
          total: books.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(books.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get books',
      error: 'BOOKS_FETCH_FAILED'
    });
  }
});

// Get student statistics
router.get('/stats', requireRoles(['student']), async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = {
      totalBooksAccessed: await BookAccessLog.count({
        where: { user_id: userId }
      }),
      activeSubscriptions: await UserSubscription.count({
        where: { 
          user_id: userId, 
          status: 'active',
          end_date: { [Op.gte]: new Date() }
        }
      }),
      totalSubscriptions: await UserSubscription.count({
        where: { user_id: userId }
      })
    };

    // Get most accessed categories
    const categoryStats = await BookAccessLog.findAll({
      where: { user_id: userId },
      include: [{
        model: Book,
        as: 'book',
        attributes: ['category']
      }],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('BookAccessLog.id')), 'access_count']
      ],
      group: ['book.category'],
      order: [[sequelize.fn('COUNT', sequelize.col('BookAccessLog.id')), 'DESC']],
      limit: 5
    });

    stats.topCategories = categoryStats;

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: 'STATS_FETCH_FAILED'
    });
  }
});

export default router;