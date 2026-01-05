import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, college_id, student_id, mobile, profile_image_url, year } = req.body;

    // Validate role
    const validRoles = ['super_admin', 'college_admin', 'student', 'user'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: super_admin, college_admin, student, user',
        error: 'INVALID_ROLE'
      });
    }

    // Validate role-college constraints
    if ((role === 'super_admin' || role === 'user') && college_id) {
      return res.status(400).json({
        success: false,
        message: 'Super admin and user roles cannot be associated with a college',
        error: 'INVALID_ROLE_COLLEGE_COMBO'
      });
    }

    if ((role === 'college_admin' || role === 'student') && !college_id) {
      return res.status(400).json({
        success: false,
        message: 'College admin and student roles require a college association',
        error: 'COLLEGE_REQUIRED'
      });
    }

    if (role === 'student' && !student_id) {
      return res.status(400).json({
        success: false,
        message: 'Student role requires a student ID',
        error: 'STUDENT_ID_REQUIRED'
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

    // Create user
    const user = await User.create({
      email,
      password_hash: password, // Stored as plain text
      full_name,
      role: role || 'student',
      college_id,
      student_id,
      mobile,
      profile_image_url,
      year,
      is_active: true,
      is_verified: false
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        collegeId: user.college_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password_hash;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: 'REGISTRATION_FAILED'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user - use unscoped to ensure password_hash is included
    const user = await User.unscoped().findOne({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account inactive',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Debug: Log what we got from database
    console.log('User found:', user.email);
    console.log('Password hash exists:', !!user.password_hash);
    console.log('Password hash length:', user.password_hash ? user.password_hash.length : 'N/A');

    // Check password
    if (!user.password_hash) {
      console.error('Password hash is missing for user:', user.email);
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: 'AUTH_ERROR'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        collegeId: user.college_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await user.update({ last_login: new Date() });

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: 'LOGIN_FAILED'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: 'PROFILE_FETCH_FAILED'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { userId, email, role, collegeId } = req.user;

    // Generate new token
    const token = jwt.sign(
      { userId, email, role, collegeId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: 'TOKEN_REFRESH_FAILED'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;