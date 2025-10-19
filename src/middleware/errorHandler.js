/**
 * Global Error Handler Middleware
 * Handles all application errors and sends appropriate responses
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Default error response
  let error = {
    success: false,
    message: 'Internal Server Error',
    error: 'INTERNAL_ERROR'
  };

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    error = {
      success: false,
      message: 'Validation Error',
      error: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    };
    return res.status(400).json(error);
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = {
      success: false,
      message: 'Resource already exists',
      error: 'DUPLICATE_RESOURCE',
      details: err.errors.map(e => ({
        field: e.path,
        message: `${e.path} already exists`
      }))
    };
    return res.status(409).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    };
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    };
    return res.status(401).json(error);
  }

  // Custom application errors
  if (err.statusCode) {
    error = {
      success: false,
      message: err.message,
      error: err.code || 'APPLICATION_ERROR'
    };
    return res.status(err.statusCode).json(error);
  }

  // Default 500 error
  return res.status(500).json(error);
};

export default errorHandler;