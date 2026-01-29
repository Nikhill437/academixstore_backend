/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides fine-grained access control for educational book system
 */

// User role constants
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  COLLEGE_ADMIN: 'college_admin',
  STUDENT: 'student',
  USER: 'user'
};

// Role hierarchy - higher roles inherit permissions from lower roles
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 4,
  [USER_ROLES.COLLEGE_ADMIN]: 3,
  [USER_ROLES.STUDENT]: 2,
  [USER_ROLES.USER]: 1
};

/**
 * Check if user has required role or higher
 * @param {string} userRole - Current user's role
 * @param {string} requiredRole - Required role for access
 * @returns {boolean} - True if user has required permissions
 */
export const hasRoleOrHigher = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Super Admin access middleware
 * Only allows super_admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required',
      error: 'SUPER_ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Admin access middleware
 * Allows super_admin and college_admin roles
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.COLLEGE_ADMIN];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Student access middleware
 * Allows super_admin, college_admin, and student roles
 */
export const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.COLLEGE_ADMIN, USER_ROLES.STUDENT];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Student access required',
      error: 'STUDENT_REQUIRED'
    });
  }

  next();
};

/**
 * Individual User access middleware
 * Allows super_admin and user roles
 */
export const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.USER];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'User access required',
      error: 'USER_REQUIRED'
    });
  }

  next();
};

/**
 * College Admin access middleware
 * Allows super_admin and college_admin roles
 */
export const requireCollegeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.COLLEGE_ADMIN];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'College admin access required',
      error: 'COLLEGE_ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * College-specific access middleware
 * Ensures admin can only access their own college data
 * Super admin can access all colleges
 */
export const requireCollegeAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  // Super admin has access to all colleges
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // College admin can only access their own college
  if (req.user.role === USER_ROLES.COLLEGE_ADMIN) {
    const requestedCollegeId = req.params.collegeId || req.body.collegeId || req.query.collegeId;
    
    if (requestedCollegeId && requestedCollegeId !== req.user.collegeId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this college',
        error: 'COLLEGE_ACCESS_DENIED'
      });
    }
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions',
    error: 'ACCESS_DENIED'
  });
};

/**
 * Self-access or admin middleware
 * Users can access their own data, admins can access students in their college
 */
export const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  
  // Super admin has access to everything
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Users can access their own data
  if (targetUserId === req.user.id) {
    return next();
  }

  // College admins can access students in their college (will be validated at service level)
  if (req.user.role === USER_ROLES.COLLEGE_ADMIN) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied',
    error: 'SELF_OR_ADMIN_REQUIRED'
  });
};

/**
 * Book access middleware
 * Ensures proper access control for books based on user type
 */
export const requireBookAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  // Super admin has access to all books
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // College admin can manage books for their college
  if (req.user.role === USER_ROLES.COLLEGE_ADMIN) {
    return next(); // College-specific validation will be done at service level
  }

  // Students can view books (specific access control at service level)
  if (req.method === 'GET' && req.user.role === USER_ROLES.STUDENT) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Insufficient permissions for book access',
    error: 'BOOK_ACCESS_DENIED'
  });
};

/**
 * Question Paper access middleware
 * Ensures proper access control for question papers based on user type
 */
export const requireQuestionPaperAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
  }

  try {
    const { questionPaperId } = req.params;
    
    // Import QuestionPaper model dynamically to avoid circular dependencies
    const { QuestionPaper } = await import('../models/index.js');
    
    // Find question paper
    const questionPaper = await QuestionPaper.findByPk(questionPaperId);
    
    if (!questionPaper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
        error: 'QUESTION_PAPER_NOT_FOUND'
      });
    }

    // Check access using model method
    if (!questionPaper.isAccessibleBy(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this question paper',
        error: 'ACCESS_DENIED'
      });
    }

    // Attach question paper to request for downstream use
    req.questionPaper = questionPaper;
    next();
    
  } catch (error) {
    console.error('Question paper access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking question paper access',
      error: 'SERVER_ERROR'
    });
  }
};


/**
 * Generic role checker middleware factory
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Middleware function
 */
export const requireRoles = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        error: 'ROLE_REQUIRED'
      });
    }

    next();
  };
};

/**
 * Permission validator based on resource and action
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @returns {Function} Middleware function
 */
export const requirePermission = (resource, action) => {
  // Permission matrix defining what each role can do
  const permissions = {
    [USER_ROLES.SUPER_ADMIN]: {
      '*': ['*'] // Super admin can do everything
    },
    [USER_ROLES.COLLEGE_ADMIN]: {
      'colleges': ['read'],
      'students': ['create', 'read', 'update', 'delete'],
      'books': ['create', 'read', 'update', 'delete'],
      'advertisements': ['create', 'read', 'update', 'delete']
    },
    [USER_ROLES.STUDENT]: {
      'books': ['read'],
      'profile': ['read', 'update']
    },
    [USER_ROLES.USER]: {
      'books': ['read'],
      'profile': ['read', 'update']
    }
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      });
    }

    const userPermissions = permissions[req.user.role] || {};
    
    // Check wildcard permissions for super admin
    if (userPermissions['*'] && userPermissions['*'].includes('*')) {
      return next();
    }

    // Check specific resource permissions
    const resourcePermissions = userPermissions[resource] || [];
    
    if (resourcePermissions.includes('*') || resourcePermissions.includes(action)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied: ${action} on ${resource}`,
      error: 'PERMISSION_DENIED'
    });
  };
};