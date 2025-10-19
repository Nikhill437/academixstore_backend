import express from 'express';
import { Op } from 'sequelize';
import { College, User, Book, sequelize } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get all colleges (public for registration)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) {
      whereClause.is_active = status === 'active';
    }

    const colleges = await College.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        colleges: colleges.rows,
        pagination: {
          total: colleges.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(colleges.count / limit)
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

// Get college by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const college = await College.findByPk(id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
        error: 'COLLEGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { college }
    });
  } catch (error) {
    console.error('Get college error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get college',
      error: 'COLLEGE_FETCH_FAILED'
    });
  }
});

// Create new college (super admin only)
router.post('/', requireRoles(['super_admin']), async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      phone,
      email,
      website
    } = req.body;

    // Check if college code already exists
    const existingCollege = await College.findOne({ where: { code } });
    if (existingCollege) {
      return res.status(400).json({
        success: false,
        message: 'College code already exists',
        error: 'COLLEGE_CODE_EXISTS'
      });
    }

    const college = await College.create({
      name,
      code,
      address,
      phone,
      email,
      website,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'College created successfully',
      data: { college }
    });
  } catch (error) {
    console.error('Create college error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create college',
      error: 'COLLEGE_CREATE_FAILED'
    });
  }
});

// Update college
router.put('/:id', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;

    const college = await College.findByPk(id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
        error: 'COLLEGE_NOT_FOUND'
      });
    }

    // College admin can only update their own college
    if (requestingUserRole === 'college_admin') {
      const user = await User.findByPk(req.user.userId);
      if (user.college_id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED'
        });
      }
    }

    const {
      name,
      address,
      phone,
      email,
      website
    } = req.body;

    await college.update({
      name: name || college.name,
      address: address || college.address,
      phone: phone || college.phone,
      email: email || college.email,
      website: website || college.website
    });

    res.json({
      success: true,
      message: 'College updated successfully',
      data: { college }
    });
  } catch (error) {
    console.error('Update college error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update college',
      error: 'COLLEGE_UPDATE_FAILED'
    });
  }
});

// Get college statistics
router.get('/:id/stats', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;

    // College admin can only view their own college stats
    if (requestingUserRole === 'college_admin') {
      const user = await User.findByPk(req.user.userId);
      if (user.college_id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED'
        });
      }
    }

    const college = await College.findByPk(id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
        error: 'COLLEGE_NOT_FOUND'
      });
    }

    const stats = {
      totalStudents: await User.count({
        where: { college_id: id, role: 'student', is_active: true }
      }),
      totalAdmins: await User.count({
        where: { college_id: id, role: 'college_admin', is_active: true }
      }),
      totalBooks: await Book.count({
        where: { college_id: id, is_active: true }
      }),
      totalUsers: await User.count({
        where: { college_id: id, is_active: true }
      })
    };

    // Get books by category
    const booksByCategory = await Book.findAll({
      where: { college_id: id, is_active: true },
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category']
    });

    // Recent activity
    const recentUsers = await User.findAll({
      where: { college_id: id },
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const recentBooks = await Book.findAll({
      where: { college_id: id },
      include: ['creator'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        college,
        stats,
        booksByCategory,
        recentUsers,
        recentBooks
      }
    });
  } catch (error) {
    console.error('Get college stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get college statistics',
      error: 'COLLEGE_STATS_FETCH_FAILED'
    });
  }
});

// Get college users
router.get('/:id/users', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;
    const requestingUserRole = req.user.role;

    // College admin can only view their own college users
    if (requestingUserRole === 'college_admin') {
      const user = await User.findByPk(req.user.userId);
      if (user.college_id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          error: 'ACCESS_DENIED'
        });
      }
    }

    const whereClause = { college_id: id };
    if (role) whereClause.role = role;

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(users.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get college users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get college users',
      error: 'COLLEGE_USERS_FETCH_FAILED'
    });
  }
});

// Get college books
router.get('/:id/books', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { college_id: id, is_active: true };
    if (category) whereClause.category = category;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { authorname: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const books = await Book.findAndCountAll({
      where: whereClause,
      include: ['creator'],
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
    console.error('Get college books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get college books',
      error: 'COLLEGE_BOOKS_FETCH_FAILED'
    });
  }
});

export default router;