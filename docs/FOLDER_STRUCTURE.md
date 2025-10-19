# Educational Book Subscription System - Folder Structure

```
educational-book-subscription/
├── package.json                      # Project dependencies and scripts
├── .env                              # Environment variables (not tracked in git)
├── .gitignore                        # Git ignore rules
├── README.md                         # Project documentation
│
├── src/                              # Source code
│   ├── server.js                     # Main application entry point
│   ├── app.js                        # Express app configuration
│   │
│   ├── config/                       # Configuration files
│   │   ├── database.js               # Database configuration
│   │   ├── aws.js                    # AWS S3 configuration
│   │   ├── jwt.js                    # JWT configuration
│   │   └── constants.js              # Application constants
│   │
│   ├── controllers/                  # Route controllers
│   │   ├── authController.js         # Authentication logic
│   │   ├── userController.js         # User management
│   │   ├── studentController.js      # Student management
│   │   ├── adminController.js        # Admin management
│   │   ├── bookController.js         # Book management
│   │   ├── collegeController.js      # College management
│   │   ├── subscriptionController.js # Subscription management
│   │   └── advertisementController.js # Advertisement management
│   │
│   ├── middleware/                   # Custom middleware
│   │   ├── auth.js                   # Authentication middleware
│   │   ├── rbac.js                   # Role-based access control
│   │   ├── validation.js             # Request validation
│   │   ├── errorHandler.js           # Global error handling
│   │   ├── rateLimiter.js           # Rate limiting
│   │   └── fileUpload.js            # File upload handling
│   │
│   ├── models/                       # Database models (Sequelize)
│   │   ├── index.js                  # Model associations and exports
│   │   ├── User.js                   # User model
│   │   ├── College.js                # College model
│   │   ├── Book.js                   # Book model
│   │   ├── SubscriptionPlan.js       # Subscription plan model
│   │   ├── UserSubscription.js       # User subscription model
│   │   ├── Advertisement.js          # Advertisement model
│   │   ├── BookAccessLog.js          # Book access tracking
│   │   └── UserSession.js            # User session model
│   │
│   ├── routes/                       # API routes
│   │   ├── index.js                  # Main router
│   │   ├── auth.js                   # Authentication routes
│   │   ├── users.js                  # User routes
│   │   ├── students.js               # Student routes
│   │   ├── admins.js                 # Admin routes
│   │   ├── books.js                  # Book routes
│   │   ├── colleges.js               # College routes
│   │   ├── subscriptions.js          # Subscription routes
│   │   └── advertisements.js         # Advertisement routes
│   │
│   ├── services/                     # Business logic services
│   │   ├── authService.js            # Authentication business logic
│   │   ├── userService.js            # User business logic
│   │   ├── bookService.js            # Book business logic
│   │   ├── subscriptionService.js    # Subscription business logic
│   │   ├── collegeService.js         # College business logic
│   │   ├── advertisementService.js   # Advertisement business logic
│   │   ├── fileUploadService.js      # File upload to AWS S3
│   │   └── emailService.js           # Email notifications
│   │
│   ├── utils/                        # Utility functions
│   │   ├── helpers.js                # General helper functions
│   │   ├── validators.js             # Input validation schemas
│   │   ├── logger.js                 # Logging utility
│   │   ├── encryption.js             # Password hashing utilities
│   │   └── responseFormatter.js      # API response formatting
│   │
│   └── database/                     # Database related files
│       ├── connection.js             # Database connection setup
│       ├── migrate.js                # Migration runner
│       ├── seed.js                   # Seeding script
│       ├── migrations/               # Database migrations
│       └── seeds/                    # Database seed files
│           ├── 001-super-admin.js    # Create super admin
│           ├── 002-sample-colleges.js # Sample colleges
│           └── 003-subscription-plans.js # Subscription plans
│
├── tests/                            # Test files
│   ├── unit/                         # Unit tests
│   │   ├── controllers/              # Controller tests
│   │   ├── services/                 # Service tests
│   │   ├── middleware/               # Middleware tests
│   │   └── utils/                    # Utility tests
│   │
│   ├── integration/                  # Integration tests
│   │   ├── auth.test.js             # Authentication integration tests
│   │   ├── books.test.js            # Book management tests
│   │   └── users.test.js            # User management tests
│   │
│   └── setup.js                     # Test setup and configuration
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── DATABASE_SCHEMA.md           # Database schema documentation
│   ├── DEPLOYMENT.md                # Deployment guide
│   ├── FOLDER_STRUCTURE.md          # This file
│   └── UI_WIREFRAMES.md            # UI design suggestions
│
├── public/                          # Public assets
│   ├── uploads/                     # Temporary uploaded files
│   └── static/                      # Static assets
│
└── database/                        # Database schema and migrations
    ├── schema.sql                   # Complete database schema
    └── sample_data.sql              # Sample data for development

```

## Key Architecture Principles

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses, delegate to services
- **Services**: Contain business logic, interact with models
- **Models**: Define data structure and database interactions
- **Middleware**: Handle cross-cutting concerns (auth, validation, logging)

### 2. **Role-Based Architecture**
- Each controller handles role-specific operations
- Middleware enforces role-based access control
- Services contain role-specific business logic

### 3. **Security First**
- Authentication middleware protects all routes
- Role-based access control at middleware level
- Input validation for all endpoints
- Rate limiting to prevent abuse

### 4. **Scalable Design**
- Modular structure allows easy feature addition
- Service layer enables business logic reuse
- Proper error handling and logging
- Database indexing for performance

### 5. **Testing Strategy**
- Unit tests for individual functions
- Integration tests for API endpoints
- Test setup with proper mocking
- Coverage reporting

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bookapp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookapp
DB_USER=your_db_user
DB_PASS=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-book-uploads-bucket

# Server
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```