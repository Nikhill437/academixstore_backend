# Educational Book Subscription System

A comprehensive role-based educational platform that provides book subscription services with different access levels for Super Admins, Admins (Colleges), Students, and Individual Users.

## 🎯 System Overview

This system addresses the unique needs of educational institutions and individual learners by providing:

- **College-based student management** with free textbook access
- **Individual user subscriptions** for broader book collections
- **Role-based access control** ensuring data security and appropriate permissions
- **Scalable architecture** supporting multiple colleges and thousands of users

## 🏗️ Architecture

### User Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Super Admin** | System administrator | Full CRUD on all entities, system analytics |
| **Admin (College)** | College representative | Manage students, books, and ads for their college |
| **Student** | College student | Access books for their year (free) |
| **User** | Individual subscriber | Access books via subscription plans |

### Key Features

✅ **Authentication & Authorization**
- JWT-based authentication with session management
- Role-based access control (RBAC) middleware
- Password hashing with bcrypt

✅ **User Management**
- Super Admin creates Admins (Colleges)
- Admins create Students with auto-generated credentials
- Individual Users self-register

✅ **Book Management**
- College-specific books (free for students)
- Global books (subscription-based for users)
- AWS S3 integration for file storage
- Access logging and analytics

✅ **Subscription System**
- Multiple subscription plans
- Payment integration (Razorpay ready)
- Automatic renewal support

✅ **Advertisement System**
- Targeted ads by role, college, and year
- Click tracking and analytics
- Scheduled campaigns

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- AWS S3 bucket (for file storage)
- Razorpay account (for payments)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd educational-book-subscription
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   # Create PostgreSQL database
   createdb bookapp_dev
   
   # Run the schema
   psql -d bookapp_dev -f database/schema.sql
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000/api`

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bookapp_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookapp_dev
DB_USER=your_db_user
DB_PASS=your_db_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-book-uploads-bucket

# Server
PORT=3000
NODE_ENV=development
```

## 📊 Database Schema

### Core Tables

- **users**: Unified table for all user types with role-based fields
- **colleges**: Educational institutions managed by admins
- **books**: Digital books with college-specific and global access
- **subscription_plans**: Available subscription tiers
- **user_subscriptions**: Individual user subscription records
- **advertisements**: Targeted promotional content
- **book_access_logs**: Tracking student/user book access
- **user_sessions**: JWT session management

### Key Relationships

```
Users ──── Colleges (college_id)
Books ──── Colleges (college_id)
Users ──── UserSubscriptions (user_id)
SubscriptionPlans ──── UserSubscriptions (plan_id)
```

## 🔌 API Reference

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### Super Admin Endpoints
```http
POST   /api/admins/create          # Create admin & college
GET    /api/users                  # List all users
GET    /api/colleges               # List all colleges
GET    /api/analytics/dashboard    # System analytics
```

### Admin (College) Endpoints
```http
POST   /api/students               # Create student
GET    /api/students               # List college students
POST   /api/books                  # Add college book
GET    /api/books                  # List college books
POST   /api/advertisements         # Create targeted ads
```

### Student Endpoints
```http
GET    /api/books/my-books         # Books for student's year
GET    /api/books/:id              # Book details
POST   /api/books/:id/access       # Log book access
GET    /api/profile                # Student profile
```

### User Endpoints
```http
GET    /api/books                  # Browse all books
POST   /api/subscriptions          # Create subscription
GET    /api/subscriptions          # User's subscriptions
GET    /api/subscription-plans     # Available plans
```

For detailed API documentation, see [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

## 🎨 Frontend Design

The system includes comprehensive UI designs for each role:

- **Super Admin**: Analytics dashboard with user/college management
- **Admin**: Student and book management interface
- **Student**: Simple book library with download capabilities
- **User**: Book marketplace with subscription management

View detailed wireframes and design specifications in [`docs/UI_WIREFRAMES.md`](docs/UI_WIREFRAMES.md).

## 🏛️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Flutter App   │    │   React Web     │    │   Admin Panel   │
│   (Students)    │    │  (Users/Admin)  │    │ (Super Admin)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Express.js    │
                    │   REST API      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │  PostgreSQL     │
                    │  Database       │
                    └─────────────────┘
```

### Technology Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL with Sequelize ORM
- JWT authentication
- AWS S3 for file storage
- Razorpay for payments

**Frontend Options:**
- React.js + Next.js (Web dashboards)
- Flutter (Mobile apps)
- Tailwind CSS (Styling)

## 🔒 Security Features

- **Authentication**: JWT tokens with secure session management
- **Authorization**: Role-based access control at endpoint level
- **Data Protection**: Password hashing, input validation
- **Rate Limiting**: Prevents API abuse
- **CORS**: Configured for production security
- **Helmet.js**: Security headers

## 📈 Scalability Considerations

- **Database Indexing**: Optimized for common queries
- **Modular Architecture**: Easy to add new features
- **Cloud-Ready**: AWS S3 integration, horizontal scaling support
- **Caching**: Redis-ready for session and data caching
- **Microservices**: Can be split into smaller services

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch
```

## 📝 Development Guidelines

### Code Style
- ES6+ JavaScript with modules
- Consistent error handling
- Input validation on all endpoints
- Comprehensive logging

### Git Workflow
```bash
# Feature development
git checkout -b feature/book-management
# ... develop feature ...
git commit -m "feat: add book upload functionality"
git push origin feature/book-management
# ... create pull request ...
```

## 🚢 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   ```

2. **Database Migration**
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

### Docker Support
```dockerfile
# Dockerfile included for containerized deployment
docker build -t bookapp .
docker run -p 3000:3000 --env-file .env bookapp
```

## 📚 Documentation

- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) - Complete API reference
- [`docs/UI_WIREFRAMES.md`](docs/UI_WIREFRAMES.md) - Frontend design specifications
- [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md) - Project organization
- [`database/schema.sql`](database/schema.sql) - Database schema

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

Please follow the existing code style and include tests for new features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review API examples in the docs folder

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core API development
- ✅ Database schema design
- ✅ Authentication system
- ✅ Role-based access control

### Phase 2 (Next)
- [ ] Frontend implementation
- [ ] File upload functionality
- [ ] Payment integration
- [ ] Email notifications

### Phase 3 (Future)
- [ ] Mobile app development
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Offline reading capabilities

---

**Built with ❤️ for educational institutions and learners worldwide.**