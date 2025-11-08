import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import models and database connection
import { testConnection, syncModels } from './models/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import studentRoutes from './routes/students.js';
import adminRoutes from './routes/admins.js';
import bookRoutes from './routes/books.js';
import collegeRoutes from './routes/colleges.js';
import subscriptionRoutes from './routes/subscriptions.js';
import advertisementRoutes from './routes/advertisements.js';
import systemSettingsRoutes from './routes/systemSettings.js';
import individualUsersRoutes from './routes/individualUsers.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers

// CORS configuration for production deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://192.168.1.7:3000'
    ];
    
    // In production, allow all origins (you can restrict this later)
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, change to false to restrict
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes
app.use(compression()); // Gzip compression
app.use(morgan('combined')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Educational Book Subscription API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/admins', authenticateToken, adminRoutes);
app.use('/api/books', bookRoutes); // Some endpoints are public
app.use('/api/colleges', authenticateToken, collegeRoutes);
app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);
app.use('/api/advertisements', advertisementRoutes); // Some endpoints are public
app.use('/api/system-settings', systemSettingsRoutes); // Some endpoints are public
app.use('/api/individual-users', individualUsersRoutes); // Super admin only

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: 'NOT_FOUND'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await testConnection();
    
    // Sync models with database (be careful with { force: true } in production)
    console.log('🔄 Synchronizing database models...');
    await syncModels({ 
      alter: process.env.NODE_ENV === 'development',
      force: process.env.DB_FORCE_SYNC === 'true'
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Educational Book Subscription API running on port ${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🏥 Network health check: http://192.168.1.7:${PORT}/health`);
      console.log(`📖 API base URL: http://localhost:${PORT}/api`);
      console.log(`📖 Network API URL: http://192.168.1.7:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;