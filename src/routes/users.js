import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, College } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, collegeId, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (collegeId) whereClause.college_id = collegeId;
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // College admins can only see users from their college (exclude regular users)
    if (req.user.role === 'college_admin') {
      whereClause.college_id = req.user.collegeId;
      whereClause.role = { [Op.ne]: 'user' }; // College admins cannot see regular users
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      include: ['college'],
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
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: 'USERS_FETCH_FAILED'
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Users can only view their own profile unless they're admin
    if (id !== requestingUserId.toString() && !['super_admin', 'college_admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
      include: ['college']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: 'USER_FETCH_FAILED'
    });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Users can only update their own profile unless they're admin
    if (id !== requestingUserId.toString() && !['super_admin', 'college_admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    const {
      full_name,
      email,
      mobile,
      profile_image_url
    } = req.body;

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
      attributes: { exclude: ['password_hash'] },
      include: ['college']
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: 'PROFILE_UPDATE_FAILED'
    });
  }
});

// Change password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Users can only change their own password unless they're admin
    if (id !== requestingUserId.toString() && !['super_admin', 'college_admin'].includes(requestingUserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Verify current password (unless admin is changing someone else's password)
    if (id === requestingUserId.toString()) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD'
        });
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password_hash: hashedNewPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: 'PASSWORD_CHANGE_FAILED'
    });
  }
});

// Deactivate user (admin only)
router.put('/:id/deactivate', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
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

    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: 'USER_DEACTIVATION_FAILED'
    });
  }
});

// Activate user (admin only)
router.put('/:id/activate', requireRoles(['super_admin', 'college_admin']), async (req, res) => {
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

    await user.update({ is_active: true });

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: 'USER_ACTIVATION_FAILED'
    });
  }
});

export default router;