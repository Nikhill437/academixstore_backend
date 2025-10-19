import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const router = express.Router();

/**
 * Get all individual users (Super Admin only)
 * Only shows users with role 'user'
 */
router.get('/', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = { 
        role: 'user',
        is_active: true 
      };
      
      if (search) {
        whereClause[Op.or] = [
          { full_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const users = await User.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password_hash'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
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
      console.error('Get individual users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get individual users',
        error: 'USERS_FETCH_FAILED'
      });
    }
  }
);

/**
 * Get individual user by ID (Super Admin only)
 */
router.get('/:id', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        },
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get individual user',
        error: 'USER_FETCH_FAILED'
      });
    }
  }
);

/**
 * Create individual user (Super Admin only)
 */
router.post('/', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { 
        email, 
        password, 
        full_name, 
        mobile, 
        profile_image_url 
      } = req.body;

      // Validate required fields
      if (!email || !password || !full_name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and full name are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
          error: 'USER_ALREADY_EXISTS'
        });
      }

      // Create individual user
      const user = await User.create({
        email,
        password_hash: password, // Will be hashed by the model hook
        full_name,
        role: 'user',
        college_id: null, // Individual users are not associated with colleges
        student_id: null,
        mobile,
        profile_image_url,
        is_active: true,
        is_verified: false
      });

      // Remove password from response
      const userResponse = { ...user.toJSON() };
      delete userResponse.password_hash;

      res.status(201).json({
        success: true,
        message: 'Individual user created successfully',
        data: { user: userResponse }
      });
    } catch (error) {
      console.error('Create individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create individual user',
        error: 'USER_CREATE_FAILED'
      });
    }
  }
);

/**
 * Update individual user (Super Admin only)
 */
router.put('/:id', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        full_name, 
        email, 
        mobile, 
        profile_image_url 
      } = req.body;

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already taken',
            error: 'EMAIL_ALREADY_TAKEN'
          });
        }
      }

      await user.update({
        full_name: full_name || user.full_name,
        email: email || user.email,
        mobile: mobile || user.mobile,
        profile_image_url: profile_image_url || user.profile_image_url
      });

      const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ['password_hash'] }
      });

      res.json({
        success: true,
        message: 'Individual user updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      console.error('Update individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update individual user',
        error: 'USER_UPDATE_FAILED'
      });
    }
  }
);

/**
 * Change individual user password (Super Admin only)
 */
router.put('/:id/password', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password is required',
          error: 'NEW_PASSWORD_REQUIRED'
        });
      }

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password_hash: hashedNewPassword });

      res.json({
        success: true,
        message: 'Individual user password changed successfully'
      });
    } catch (error) {
      console.error('Change individual user password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change individual user password',
        error: 'PASSWORD_CHANGE_FAILED'
      });
    }
  }
);

/**
 * Deactivate individual user (Super Admin only)
 */
router.put('/:id/deactivate', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      await user.update({ is_active: false });

      res.json({
        success: true,
        message: 'Individual user deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate individual user',
        error: 'USER_DEACTIVATION_FAILED'
      });
    }
  }
);

/**
 * Activate individual user (Super Admin only)
 */
router.put('/:id/activate', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      await user.update({ is_active: true });

      res.json({
        success: true,
        message: 'Individual user activated successfully'
      });
    } catch (error) {
      console.error('Activate individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate individual user',
        error: 'USER_ACTIVATION_FAILED'
      });
    }
  }
);

/**
 * Delete individual user (Super Admin only)
 */
router.delete('/:id', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: { 
          id: id,
          role: 'user' 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Individual user not found',
          error: 'USER_NOT_FOUND'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'Individual user deleted successfully'
      });
    } catch (error) {
      console.error('Delete individual user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete individual user',
        error: 'USER_DELETE_FAILED'
      });
    }
  }
);

export default router;