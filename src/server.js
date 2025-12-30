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
import orderRoutes from './routes/order.js';
// Import middleware
import { authenticateToken } from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';

import multer from "multer";
import { pool } from "./db.js";
import { uploadToS3 } from "./s3.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer(); // memory storage

// Trust proxy - required for Render and other reverse proxies
app.set('trust proxy', 1);

// CORS configuration - MUST be before helmet
const corsOptions = {
  origin: true, // Allow all origins in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
};

app.use(cors(corsOptions));
// Handle preflight requests - Express 5 compatible
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Global middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false
})); // Security headers
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

// CORS test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS is working correctly',
    origin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
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
app.use('/api/orders', authenticateToken, orderRoutes);

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const file = req.file;

    // 1) Upload to S3
    const { key, url } = await uploadToS3(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // 2) Insert DB row
    const query = `
      INSERT INTO uploads (original_name, mime_type, s3_key, s3_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [file.originalname, file.mimetype, key, url];
    const result = await pool.query(query, values);

    // 3) Respond
    res.json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: err.message,
    });
  }
});



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