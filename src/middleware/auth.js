import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import sessionService from '../services/sessionService.js';

/**
 * Authentication middleware to verify JWT tokens and validate sessions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          error: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }

    // Validate session in database
    try {
      const session = await sessionService.validateSession(token);
      
      if (!session) {
        // Session not found, revoked, or expired
        return res.status(401).json({
          success: false,
          message: 'Session invalid or expired',
          error: 'SESSION_REVOKED'
        });
      }
    } catch (sessionError) {
      console.error('Session validation error:', sessionError);
      return res.status(500).json({
        success: false,
        message: 'Session validation failed',
        error: 'SESSION_VALIDATION_FAILED'
      });
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId, // Add userId for compatibility
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      collegeId: decoded.collegeId || null, // Handle undefined collegeId
      year: decoded.year || null // Add year field for student filtering
    };

    // Store token in request for logout functionality
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication server error',
      error: 'AUTH_SERVER_ERROR'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Used for endpoints that can work with or without authentication
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  // If token is provided, validate it
  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = {
      id: decoded.userId,
      userId: decoded.userId, // Add userId for compatibility
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      collegeId: decoded.collegeId || null, // Handle undefined collegeId
      year: decoded.year || null // Add year field for student filtering
    };
  } catch (error) {
    // If token is invalid, continue without authentication
    req.user = null;
  }

  next();
};

// Backward compatibility
export const authenticateJWT = authenticateToken;

// Role authorization function
export function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'FORBIDDEN'
      });
    }
    
    next();
  };
}

export default authenticateToken;
