import express from 'express';
import { Op } from 'sequelize';
import { User, College, Book, UserSubscription, Advertisement, sequelize } from '../models/index.js';
import  { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get admin dashboard statistics
router.get('/dashboard', requireRoles(['admin']), async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.count(),
      totalColleges: await College.count(),
      totalBooks: await Book.count(),
      activeSubscriptions: await UserSubscription.count({
        where: { 
          status: 'active',
          end_date: { [Op.gte]: new Date() }
        }
      })
    };

    // Recent activity
    const recentUsers = await User.findAll({
      attributes: { exclude: ['password'] },
      include: ['college'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const recentBooks = await Book.findAll({
      include: ['college', 'creator'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        stats,
        recentUsers,
        recentBooks
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: 'DASHBOARD_LOAD_FAILED'
    });
  }
});

// Get system analytics
router.get('/analytics', requireRoles(['admin']), async (req, res) => {
  try {
    // User registration trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userRegistrations = await User.findAll({
      where: {
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
    });

    // Book uploads by college
    const booksByCollege = await Book.findAll({
      include: [{
        model: College,
        as: 'college',
        attributes: ['name']
      }],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Book.id')), 'book_count']
      ],
      group: ['college.id', 'college.name'],
      order: [[sequelize.fn('COUNT', sequelize.col('Book.id')), 'DESC']],
      limit: 10
    });

    // Subscription trends
    const subscriptionStats = await UserSubscription.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        userRegistrations,
        booksByCollege,
        subscriptionStats
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load analytics',
      error: 'ANALYTICS_LOAD_FAILED'
    });
  }
});

// Get all colleges with statistics
router.get('/colleges', requireRoles(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const colleges = await College.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'users',
          attributes: [],
          required: false
        },
        {
          model: Book,
          as: 'books',
          attributes: [],
          required: false
        }
      ],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('users.id'))), 'user_count'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('books.id'))), 'book_count']
        ]
      },
      group: ['College.id'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false
    });

    res.json({
      success: true,
      data: {
        colleges: colleges.rows,
        pagination: {
          total: colleges.count.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(colleges.count.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get colleges',
      error: 'COLLEGES_FETCH_FAILED'
    });
  }
});

// Approve/reject college
router.put('/colleges/:id/status', requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'pending'

    const college = await College.findByPk(id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
        error: 'COLLEGE_NOT_FOUND'
      });
    }

    await college.update({ status });

    res.json({
      success: true,
      message: `College ${status} successfully`,
      data: { college }
    });
  } catch (error) {
    console.error('Update college status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update college status',
      error: 'COLLEGE_STATUS_UPDATE_FAILED'
    });
  }
});

// Get system logs/activity
router.get('/activity-logs', requireRoles(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;

    // This would typically come from a dedicated logging table
    // For now, we'll show recent activities from various tables
    
    const recentActivities = [];

    // Recent user registrations
    const recentUsers = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    recentUsers.forEach(user => {
      recentActivities.push({
        type: 'user_registration',
        description: `New user registered: ${user.first_name} ${user.last_name} (${user.email})`,
        timestamp: user.created_at,
        user_id: user.id
      });
    });

    // Recent book uploads
    const recentBooks = await Book.findAll({
      include: ['creator', 'college'],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    recentBooks.forEach(book => {
      recentActivities.push({
        type: 'book_upload',
        description: `New book uploaded: "${book.title}" by ${book.creator?.first_name} ${book.creator?.last_name}`,
        timestamp: book.created_at,
        user_id: book.created_by,
        book_id: book.id
      });
    });

    // Sort all activities by timestamp
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedActivities = recentActivities.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          total: recentActivities.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(recentActivities.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity logs',
      error: 'ACTIVITY_LOGS_FETCH_FAILED'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Soft delete by deactivating
    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: 'USER_DELETE_FAILED'
    });
  }
});

// Get system settings
router.get('/settings', requireRoles(['admin']), (req, res) => {
  const settings = {
    maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png'],
    defaultSubscriptionDuration: process.env.DEFAULT_SUBSCRIPTION_DURATION || 30,
    maxDownloadsPerDay: process.env.MAX_DOWNLOADS_PER_DAY || 50,
    maxStudentsPerCollege: process.env.MAX_STUDENTS_PER_COLLEGE || 10000,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 900000,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100
  };

  res.json({
    success: true,
    data: { settings }
  });
});

export default router;