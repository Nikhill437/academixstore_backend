# Educational Book Management System - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Role System
- **super_admin**: Full system access
- **college_admin**: Access to their college's data only
- **student**: View access to their college's books
- **user**: Individual users, can view all books from all colleges

---

## 📚 Authentication Routes

### 1. Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "student", // super_admin, college_admin, student, user
  "college_id": "uuid-here", // required for college_admin & student
  "student_id": "STU2024001", // required for student role
  "mobile": "+91-9999999999", // optional
  "profile_image_url": "https://example.com/image.jpg" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "student",
      "college_id": "uuid",
      "student_id": "STU2024001",
      "is_active": true,
      "is_verified": false
    },
    "token": "jwt_token_here"
  }
}
```

### 2. Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "student"
    },
    "token": "jwt_token_here"
  }
}
```

### 3. Get Current User Profile
```http
GET /api/auth/me
```
*Requires Authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "student",
      "college": {
        "id": "uuid",
        "name": "Delhi Technical University",
        "code": "DTU001"
      }
    }
  }
}
```

### 4. Refresh Token
```http
POST /api/auth/refresh
```
*Requires Authentication*

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "new_jwt_token"
  }
}
```

### 5. Logout
```http
POST /api/auth/logout
```
*Requires Authentication*

---

## 👥 User Management Routes

### 1. Get All Users
```http
GET /api/users?page=1&limit=10&role=student&search=john
```
*Requires: super_admin or college_admin*

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `collegeId` (optional): Filter by college
- `search` (optional): Search in full_name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "student",
        "college": {
          "name": "Delhi Technical University"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

### 2. Get User by ID
```http
GET /api/users/:id
```
*Requires Authentication (own profile or admin)*

### 3. Update User Profile
```http
PUT /api/users/:id
```
*Requires Authentication (own profile or admin)*

**Request Body:**
```json
{
  "full_name": "John Doe Updated",
  "email": "newemail@example.com",
  "mobile": "+91-9999999998",
  "profile_image_url": "https://example.com/newimage.jpg"
}
```

### 4. Change Password
```http
PUT /api/users/:id/password
```
*Requires Authentication*

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### 5. Deactivate User
```http
PUT /api/users/:id/deactivate
```
*Requires: super_admin or college_admin*

### 6. Activate User
```http
PUT /api/users/:id/activate
```
*Requires: super_admin or college_admin*

---

## 📖 Book Management Routes

### 1. Get Books
```http
GET /api/books?category=Computer Science&year=2024&semester=3
```
*Requires Authentication*

**Query Parameters:**
- `category` (optional): Filter by category
- `year` (optional): Filter by academic year
- `semester` (optional): Filter by semester

**Response:**
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "uuid",
        "name": "Data Structures and Algorithms",
        "authorname": "Thomas H. Cormen",
        "description": "Comprehensive guide to DSA",
        "category": "Computer Science",
        "subject": "Programming",
        "language": "English",
        "year": 2024,
        "semester": 3,
        "pages": 1312,
        "rate": 4.5,
        "download_count": 150,
        "pdf_url": "https://your-bucket.s3.region.amazonaws.com/books/pdfs/uuid/file.pdf",
        "pdf_access_url": "https://signed-url-for-students.s3.amazonaws.com/...",
        "cover_image_url": "https://your-bucket.s3.region.amazonaws.com/books/covers/uuid/cover.jpg",
        "purchased": 1,
        "college": {
          "id": "uuid",
          "name": "Delhi Technical University",
          "code": "DTU001"
        },
        "creator": {
          "full_name": "Admin User",
          "email": "admin@dtu.ac.in"
        }
      }
    ]
  }
}
```

**Important Notes:**
- **pdf_url**: Permanent S3 URL (for admins)
- **pdf_access_url**: Signed URL with 1-hour expiry (for students/users)
- **cover_image_url**: Public image URL
- **purchased**: Indicates if the authenticated user has purchased this book (1 = purchased, 0 = not purchased)
  - Only users with role 'user' can have purchased = 1
  - Students, admins always see purchased = 0
- Students and users only get `pdf_access_url` for security
- Admins get both URLs but typically use `pdf_url`

### 2. Get Single Book
```http
GET /api/books/:bookId
```
*Requires Authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "uuid",
      "name": "Data Structures and Algorithms",
      "authorname": "Thomas H. Cormen",
      "description": "Comprehensive guide to DSA",
      "isbn": "978-0262033848",
      "publisher": "MIT Press",
      "publication_year": 2009,
      "category": "Computer Science",
      "subject": "Programming",
      "language": "English",
      "year": 2024,
      "semester": 3,
      "pages": 1312,
      "rate": 4.5,
      "download_count": 150,
      "pdf_url": "https://your-bucket.s3.region.amazonaws.com/books/pdfs/uuid/file.pdf",
      "pdf_access_url": "https://signed-url-for-students.s3.amazonaws.com/...",
      "cover_image_url": "https://your-bucket.s3.region.amazonaws.com/books/covers/uuid/cover.jpg",
      "purchased": 1,
      "college": {
        "name": "Delhi Technical University"
      },
      "creator": {
        "full_name": "Admin User"
      }
    }
  }
}
```

### 3. Create Book
```http
POST /api/books
```
*Requires: super_admin or college_admin*

**Request Body:**
```json
{
  "name": "Data Structures and Algorithms",
  "description": "Comprehensive guide to DSA",
  "authorname": "Thomas H. Cormen",
  "isbn": "978-0262033848",
  "publisher": "MIT Press",
  "publication_year": 2009,
  "category": "Computer Science",
  "subject": "Programming",
  "language": "English",
  "year": 2024,
  "semester": 3,
  "pages": 1312
}
```

### 4. Update Book
```http
PUT /api/books/:bookId
```
*Requires: super_admin or college_admin*

**Request Body:** (Same as create, all fields optional)

### 5. Delete Book
```http
DELETE /api/books/:bookId
```
*Requires: super_admin or college_admin*

### 6. Upload Book PDF
```http
POST /api/books/:bookId/upload-pdf
```
*Requires: super_admin or college_admin*
*Content-Type: multipart/form-data*

**Form Data:**
- `book`: PDF file (Max: 100MB)

**Response:**
```json
{
  "success": true,
  "message": "Book PDF uploaded successfully",
  "data": {
    "book_id": "uuid",
    "pdf_url": "https://your-bucket.s3.region.amazonaws.com/books/pdfs/uuid/file.pdf",
    "signed_url": "https://signed-url-with-expiry.s3.amazonaws.com/...",
    "original_name": "data-structures.pdf"
  }
}
```

**File Requirements:**
- **Type**: PDF files only (`application/pdf`)
- **Size**: Maximum 100MB
- **Storage**: Files uploaded to AWS S3
- **URL**: Public URL stored in database

### 7. Upload Book Cover
```http
POST /api/books/:bookId/upload-cover
```
*Requires: super_admin or college_admin*
*Content-Type: multipart/form-data*

**Form Data:**
- `cover`: Image file (Max: 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Book cover uploaded successfully",
  "data": {
    "book_id": "uuid",
    "cover_image_url": "https://your-bucket.s3.region.amazonaws.com/books/covers/uuid/cover.jpg",
    "original_name": "book-cover.jpg"
  }
}
```

**File Requirements:**
- **Types**: JPEG, PNG, WebP, GIF
- **Size**: Maximum 5MB
- **Storage**: Files uploaded to AWS S3

### 8. Log Book Access
```http
POST /api/books/:bookId/access
```
*Requires Authentication*

**Request Body:**
```json
{
  "access_type": "view" // or "download"
}
```

### 9. Search Books
```http
GET /api/books/search/:query
```
*Requires Authentication*

### 10. Get Books by Category
```http
GET /api/books/category/:category
```
*Requires Authentication*

### 11. Get Books by Year
```http
GET /api/books/year/:year
```
*Requires: super_admin or college_admin*

### 12. Get Books by Semester
```http
GET /api/books/semester/:semester
```
*Requires: super_admin or college_admin*

### 13. Get Books by Year and Semester
```http
GET /api/books/year/:year/semester/:semester
```
*Requires: super_admin or college_admin*

### 14. Get Student's Books
```http
GET /api/books/my-books
```
*Requires: student role*

### 15. Get User's Books
```http
GET /api/books/user-books
```
*Requires: user role*

---

## 📤 Book PDF Upload Flow

### Complete Upload Process

The book PDF upload follows a **2-step process**:

#### **Step 1: Create Book Record**
```http
POST /api/books
```
Create the book metadata first (without PDF). This returns a `book_id`.

#### **Step 2: Upload PDF File**
```http
POST /api/books/{book_id}/upload-pdf
```
Upload the actual PDF file to AWS S3 and link it to the book.

### 🔄 Flow Diagram
```
1. Create Book → 2. Upload PDF → 3. Store S3 URL in DB → 4. Get Books API returns URLs
```

### 📁 S3 File Organization
```
your-s3-bucket/
├── books/
│   ├── pdfs/
│   │   ├── {book-id-1}/
│   │   │   └── 1696534800000-a1b2c3d4.pdf
│   │   ├── {book-id-2}/
│   │   │   └── 1696534801000-e5f6g7h8.pdf
│   └── covers/
│       ├── {book-id-1}/
│       │   └── 1696534802000-i9j0k1l2.jpg
```

### 🔐 URL Access Control

| User Role | PDF Access | URL Type |
|-----------|------------|----------|
| **super_admin** | All books | Public URL |
| **college_admin** | Own college books | Public URL |
| **student** | Own college books | **Signed URL** (1hr expiry) |
| **user** | All books | **Signed URL** (1hr expiry) |

### 🛡️ Security Features

- ✅ **File Validation**: Only PDF files, max 100MB
- ✅ **Access Control**: Role-based upload permissions
- ✅ **Signed URLs**: Time-limited access for students/users
- ✅ **Organized Storage**: Files organized by book ID
- ✅ **Cleanup**: Old files deleted when new ones uploaded

### 📱 Complete Example

#### 1. Create Book
```bash
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced JavaScript",
    "authorname": "John Doe", 
    "year": 2024,
    "semester": 5
  }'
```

#### 2. Upload PDF
```bash
curl -X POST http://localhost:5000/api/books/book-uuid/upload-pdf \
  -H "Authorization: Bearer your-jwt-token" \
  -F "book=@/path/to/your/book.pdf"
```

#### 3. Get Books (with PDF URLs)
```bash
curl -X GET "http://localhost:5000/api/books?year=2024&semester=5" \
  -H "Authorization: Bearer your-jwt-token"
```

### ⚙️ Configuration Required

**Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_CLOUDFRONT_DOMAIN=your-cdn-domain (optional)
```

**AWS S3 Permissions Required:**
- `s3:PutObject` - Upload files
- `s3:GetObject` - Generate signed URLs
- `s3:DeleteObject` - Delete old files
- `s3:ListBucket` - List bucket contents

---

## 🏫 College Management Routes

### 1. Get All Colleges
```http
GET /api/colleges?page=1&limit=10&search=delhi&status=active
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search in name, code, address
- `status` (optional): Filter by status (active/inactive)

**Response:**
```json
{
  "success": true,
  "data": {
    "colleges": [
      {
        "id": "uuid",
        "name": "Delhi Technical University",
        "code": "DTU001",
        "address": "Bawana Road, Delhi-110042",
        "phone": "+91-11-27871023",
        "email": "admin@dtu.ac.in",
        "website": "http://dtu.ac.in",
        "logo_url": "https://dtu.ac.in/logo.png",
        "is_active": true
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

### 2. Get College by ID
```http
GET /api/colleges/:id
```

### 3. Create College
```http
POST /api/colleges
```
*Requires: super_admin*

**Request Body:**
```json
{
  "name": "Delhi Technical University",
  "code": "DTU001",
  "address": "Bawana Road, Delhi-110042",
  "phone": "+91-11-27871023",
  "email": "admin@dtu.ac.in",
  "website": "http://dtu.ac.in"
}
```

### 4. Update College
```http
PUT /api/colleges/:id
```
*Requires: super_admin or college_admin (own college)*

**Request Body:** (Same as create, all fields optional)

### 5. Get College Statistics
```http
GET /api/colleges/:id/stats
```
*Requires: super_admin or college_admin*

**Response:**
```json
{
  "success": true,
  "data": {
    "college": {
      "id": "uuid",
      "name": "Delhi Technical University"
    },
    "stats": {
      "totalStudents": 1500,
      "totalAdmins": 5,
      "totalBooks": 200,
      "totalUsers": 1505
    },
    "booksByCategory": [
      {
        "category": "Computer Science",
        "count": 50
      }
    ],
    "recentUsers": [...],
    "recentBooks": [...]
  }
}
```

### 6. Get College Users
```http
GET /api/colleges/:id/users?page=1&limit=20&role=student
```
*Requires: super_admin or college_admin*

### 7. Get College Books
```http
GET /api/colleges/:id/books?page=1&limit=20&category=science
```

---

## 👤 Individual Users Management Routes

### 1. Get All Individual Users
```http
GET /api/individual-users?page=1&limit=10&search=john
```
*Requires: super_admin*

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in full_name or email

### 2. Get Individual User by ID
```http
GET /api/individual-users/:id
```
*Requires: super_admin*

### 3. Create Individual User
```http
POST /api/individual-users
```
*Requires: super_admin*

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "mobile": "+91-9999999999",
  "profile_image_url": "https://example.com/image.jpg"
}
```

### 4. Update Individual User
```http
PUT /api/individual-users/:id
```
*Requires: super_admin*

**Request Body:** (Same as create, all fields optional)

### 5. Change Individual User Password
```http
PUT /api/individual-users/:id/password
```
*Requires: super_admin*

**Request Body:**
```json
{
  "newPassword": "new_password123"
}
```

### 6. Deactivate Individual User
```http
PUT /api/individual-users/:id/deactivate
```
*Requires: super_admin*

### 7. Activate Individual User
```http
PUT /api/individual-users/:id/activate
```
*Requires: super_admin*

### 8. Delete Individual User
```http
DELETE /api/individual-users/:id
```
*Requires: super_admin*

---

## 💳 Order & Purchase Routes

### 1. Create Order (Book Purchase)
```http
POST /api/orders/create
```
*Requires Authentication*

**Request Body:**
```json
{
  "book_id": "uuid-of-book"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_xyz123",
    "amount": 49900,
    "currency": "INR",
    "razorpay_key": "rzp_test_xxxxx",
    "book": {
      "id": "uuid",
      "title": "Data Structures and Algorithms"
    }
  }
}
```

### 2. Verify Payment
```http
POST /api/orders/verify-payment
```
*Requires Authentication*

**Request Body:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "orderId": "uuid"
  }
}
```

### 3. Get My Purchased Books
```http
GET /api/orders/my-purchases?page=1&limit=10&status=paid
```
*Requires: user role only (not available for students)*

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status (default: 'paid')
  - Options: 'created', 'pending', 'paid', 'failed', 'refunded'

**Response:**
```json
{
  "success": true,
  "data": {
    "purchases": [
      {
        "id": "order-uuid",
        "book": {
          "id": "book-uuid",
          "name": "Data Structures and Algorithms",
          "authorname": "Thomas H. Cormen",
          "description": "Comprehensive guide to DSA",
          "category": "Computer Science",
          "subject": "Programming",
          "language": "English",
          "year": 2024,
          "semester": 3,
          "pages": 1312,
          "rating": 4.5,
          "pdf_access_url": "https://signed-url-with-1hr-expiry.s3.amazonaws.com/...",
          "cover_image_url": "https://your-bucket.s3.region.amazonaws.com/books/covers/uuid/cover.jpg"
        },
        "amount": 499.00,
        "currency": "INR",
        "status": "paid",
        "payment_method": "card",
        "purchased_at": "2024-12-31T10:30:00Z",
        "razorpay_order_id": "order_xyz123",
        "razorpay_payment_id": "pay_abc456"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

**Important Notes:**
- Only users with role 'user' can access this endpoint
- Students cannot purchase books (they have free access to their college books)
- PDF access URLs are signed and valid for 1 hour
- Returns books ordered by purchase date (most recent first)

---

## ⚙️ System Settings Routes

### 1. Get All System Settings
```http
GET /api/system-settings
```
*Requires: super_admin*

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "id": "uuid",
        "key": "app_name",
        "value": "Books Management System",
        "description": "Application name",
        "is_public": true,
        "updated_by": "uuid",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. Get Public System Settings
```http
GET /api/system-settings/public
```
*No Authentication Required*

### 3. Get Setting by Key
```http
GET /api/system-settings/:key
```
*Requires: super_admin*

### 4. Create/Update Setting
```http
PUT /api/system-settings/:key
```
*Requires: super_admin*

**Request Body:**
```json
{
  "value": "New Value",
  "description": "Setting description",
  "is_public": false
}
```

### 5. Delete Setting
```http
DELETE /api/system-settings/:key
```
*Requires: super_admin*

### 6. Bulk Update Settings
```http
POST /api/system-settings/bulk-update
```
*Requires: super_admin*

**Request Body:**
```json
{
  "settings": [
    {
      "key": "app_name",
      "value": "New App Name",
      "description": "Application name",
      "is_public": true
    },
    {
      "key": "maintenance_mode",
      "value": "false",
      "is_public": false
    }
  ]
}
```

### 7. Get Setting History
```http
GET /api/system-settings/:key/history
```
*Requires: super_admin*
*(Currently returns NOT_IMPLEMENTED)*

---

## 📄 Question Paper Management Routes

### Overview
The Question Paper Management system allows admins to upload and manage exam question papers (PDFs) with role-based access control. Question papers are organized by subject, year, semester, and college.

### 1. Create Question Paper
```http
POST /api/question-papers
```
*Requires: super_admin or college_admin*

**Request Body:**
```json
{
  "title": "Midterm Exam - Data Structures",
  "description": "Midterm examination covering arrays, linked lists, stacks, and queues",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100,
  "college_id": "uuid-here"
}
```

**Field Details:**
- `title` (required): String, max 500 characters
- `description` (optional): Text
- `subject` (required): String, max 100 characters
- `year` (required): Integer, 1-4 (undergraduate years)
- `semester` (required): Integer, 1-8
- `exam_type` (optional): Enum - 'midterm', 'final', 'quiz', 'practice'
- `marks` (optional): Integer, total marks for the exam
- `college_id` (optional): UUID
  - **Super admin**: Can specify any college_id or leave null for global papers
  - **College admin**: Automatically set to their college (ignored if provided)

**Response:**
```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "question_paper": {
      "id": "uuid",
      "title": "Midterm Exam - Data Structures",
      "description": "Midterm examination covering arrays, linked lists, stacks, and queues",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "college_id": "uuid",
      "is_active": true,
      "created_by": "uuid",
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

### 2. Get Question Papers (List with Filters)
```http
GET /api/question-papers?subject=Data Structures&year=2&semester=3&exam_type=midterm
```
*Requires Authentication (all roles)*

**Query Parameters:**
- `subject` (optional): Filter by subject name
- `year` (optional): Filter by academic year (1-4)
- `semester` (optional): Filter by semester (1-8)
- `exam_type` (optional): Filter by exam type (midterm, final, quiz, practice)

**Role-Based Filtering:**
- **super_admin**: Sees all question papers from all colleges
- **college_admin**: Sees only question papers from their college (all years)
- **student**: Sees only question papers from their college AND matching their year
- **user**: Sees all question papers from all colleges

**Response:**
```json
{
  "success": true,
  "data": {
    "question_papers": [
      {
        "id": "uuid",
        "title": "Midterm Exam - Data Structures",
        "description": "Midterm examination covering arrays, linked lists, stacks, and queues",
        "subject": "Data Structures",
        "year": 2,
        "semester": 3,
        "exam_type": "midterm",
        "marks": 100,
        "pdf_access_url": "https://signed-url-with-1hr-expiry.s3.amazonaws.com/...",
        "college": {
          "id": "uuid",
          "name": "Delhi Technical University",
          "code": "DTU001"
        },
        "creator": {
          "id": "uuid",
          "full_name": "Admin User",
          "email": "admin@dtu.ac.in"
        },
        "created_at": "2026-01-29T10:00:00Z",
        "updated_at": "2026-01-29T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

**Important Notes:**
- `pdf_access_url`: Signed URL valid for 1 hour (for secure access)
- Direct S3 URLs are never exposed to clients
- Results are ordered by creation date (most recent first)

### 3. Get Single Question Paper
```http
GET /api/question-papers/:questionPaperId
```
*Requires Authentication (must have access)*

**Response:**
```json
{
  "success": true,
  "data": {
    "question_paper": {
      "id": "uuid",
      "title": "Midterm Exam - Data Structures",
      "description": "Midterm examination covering arrays, linked lists, stacks, and queues",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "pdf_access_url": "https://signed-url-with-1hr-expiry.s3.amazonaws.com/...",
      "college": {
        "id": "uuid",
        "name": "Delhi Technical University",
        "code": "DTU001"
      },
      "creator": {
        "id": "uuid",
        "full_name": "Admin User",
        "email": "admin@dtu.ac.in"
      },
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

### 4. Update Question Paper
```http
PUT /api/question-papers/:questionPaperId
```
*Requires: super_admin or college_admin (own college only)*

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "subject": "Updated Subject",
  "year": 3,
  "semester": 5,
  "exam_type": "final",
  "marks": 120
}
```

**Allowed Updates:**
- title, description, subject, year, semester, exam_type, marks
- Cannot update: id, pdf_url, college_id, created_by, timestamps

**Response:**
```json
{
  "success": true,
  "message": "Question paper updated successfully",
  "data": {
    "question_paper": { /* updated question paper object */ }
  }
}
```

### 5. Delete Question Paper
```http
DELETE /api/question-papers/:questionPaperId
```
*Requires: super_admin or college_admin (own college only)*

**Behavior:**
- Performs **soft delete** (sets `is_active` to false)
- Attempts to delete PDF file from S3 (logs warning if fails)
- Question paper remains in database but won't appear in queries

**Response:**
```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

### 6. Upload Question Paper PDF
```http
POST /api/question-papers/:questionPaperId/upload-pdf
```
*Requires: super_admin or college_admin (own college only)*
*Content-Type: multipart/form-data*

**Form Data:**
- `question_paper`: PDF file (Max: 50MB)

**File Requirements:**
- **Type**: PDF files only (`application/pdf`)
- **Size**: Maximum 50MB
- **Storage**: Files uploaded to AWS S3 at `question-papers/pdfs/{id}/`
- **Naming**: Unique filename with timestamp and UUID

**Response:**
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "uuid",
    "pdf_url": "https://your-bucket.s3.region.amazonaws.com/question-papers/pdfs/uuid/file.pdf",
    "signed_url": "https://signed-url-with-1hr-expiry.s3.amazonaws.com/...",
    "original_name": "midterm-exam.pdf"
  }
}
```

**Upload Process:**
1. Validates file type and size
2. Checks user permissions
3. Deletes old PDF from S3 (if exists)
4. Uploads new PDF to S3
5. Updates question paper record with S3 URL
6. Returns signed URL for immediate access

### 7. Refresh PDF Access URL
```http
GET /api/question-papers/:questionPaperId/refresh-url
```
*Requires Authentication (must have access)*

**Purpose:** Generate a new signed URL when the previous one expires (after 1 hour)

**Response:**
```json
{
  "success": true,
  "data": {
    "question_paper_id": "uuid",
    "pdf_access_url": "https://new-signed-url-with-1hr-expiry.s3.amazonaws.com/...",
    "expires_in": 3600
  }
}
```

### 8. Log Question Paper Access
```http
POST /api/question-papers/:questionPaperId/access
```
*Requires Authentication (must have access)*

**Request Body:**
```json
{
  "access_type": "view"
}
```

**Access Types:**
- `view`: User viewed the question paper
- `download`: User downloaded the PDF

**Response:**
```json
{
  "success": true,
  "message": "Question paper access logged successfully"
}
```

**Logged Information:**
- user_id
- question_paper_id
- access_type
- timestamp
- IP address
- User agent

### 9. Get Question Papers by Subject
```http
GET /api/question-papers/subject/:subject
```
*Requires Authentication*

**Example:**
```http
GET /api/question-papers/subject/Data%20Structures
```

**Response:** Same as "Get Question Papers" but filtered by subject

### 10. Get Question Papers by Year
```http
GET /api/question-papers/year/:year
```
*Requires: super_admin or college_admin*

**Example:**
```http
GET /api/question-papers/year/2
```

### 11. Get Question Papers by Semester
```http
GET /api/question-papers/semester/:semester
```
*Requires: super_admin or college_admin*

**Example:**
```http
GET /api/question-papers/semester/3
```

### 12. Get Question Papers by Exam Type
```http
GET /api/question-papers/exam-type/:examType
```
*Requires Authentication*

**Example:**
```http
GET /api/question-papers/exam-type/midterm
```

**Valid Exam Types:**
- `midterm`
- `final`
- `quiz`
- `practice`

---

## 📤 Question Paper Upload Flow

### Complete Upload Process

The question paper upload follows a **2-step process**:

#### **Step 1: Create Question Paper Record**
```http
POST /api/question-papers
```
Create the question paper metadata first (without PDF). This returns a `question_paper_id`.

#### **Step 2: Upload PDF File**
```http
POST /api/question-papers/{question_paper_id}/upload-pdf
```
Upload the actual PDF file to AWS S3 and link it to the question paper.

### 🔄 Flow Diagram
```
1. Create Question Paper → 2. Upload PDF → 3. Store S3 URL in DB → 4. Get API returns signed URLs
```

### 📁 S3 File Organization
```
your-s3-bucket/
├── question-papers/
│   └── pdfs/
│       ├── {question-paper-id-1}/
│       │   └── 1706534800000-a1b2c3d4.pdf
│       ├── {question-paper-id-2}/
│       │   └── 1706534801000-e5f6g7h8.pdf
```

### 🔐 URL Access Control

| User Role | Access Scope | URL Type |
|-----------|-------------|----------|
| **super_admin** | All question papers | Signed URL (1hr) |
| **college_admin** | Own college papers (all years) | Signed URL (1hr) |
| **student** | Own college + own year papers | Signed URL (1hr) |
| **user** | All question papers | Signed URL (1hr) |

### 🛡️ Security Features

- ✅ **File Validation**: Only PDF files, max 50MB
- ✅ **Access Control**: Role-based upload and view permissions
- ✅ **Signed URLs**: Time-limited access (1 hour expiry)
- ✅ **Organized Storage**: Files organized by question paper ID
- ✅ **Cleanup**: Old files deleted when new ones uploaded
- ✅ **Soft Delete**: Question papers can be recovered if needed

### 📱 Complete Example

#### 1. Create Question Paper
```bash
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Exam - Data Structures",
    "subject": "Data Structures",
    "year": 2,
    "semester": 3,
    "exam_type": "final",
    "marks": 100
  }'
```

#### 2. Upload PDF
```bash
curl -X POST http://localhost:3000/api/question-papers/question-paper-uuid/upload-pdf \
  -H "Authorization: Bearer your-jwt-token" \
  -F "question_paper=@/path/to/exam-paper.pdf"
```

#### 3. Get Question Papers (with signed URLs)
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Data%20Structures&year=2&semester=3" \
  -H "Authorization: Bearer your-jwt-token"
```

#### 4. Refresh Expired URL
```bash
curl -X GET http://localhost:3000/api/question-papers/question-paper-uuid/refresh-url \
  -H "Authorization: Bearer your-jwt-token"
```

### ⚙️ Configuration Required

**Environment Variables:**
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**AWS S3 Permissions Required:**
- `s3:PutObject` - Upload files
- `s3:GetObject` - Generate signed URLs
- `s3:DeleteObject` - Delete old files
- `s3:ListBucket` - List bucket contents

---

## 🔒 Question Paper Access Matrix

| Role | Create | View All | View Own College | View Own Year | Update | Delete | Upload PDF |
|------|--------|----------|------------------|---------------|--------|--------|------------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **college_admin** | ✅ | ❌ | ✅ (all years) | ✅ | ✅* | ✅* | ✅* |
| **student** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **user** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*College admins can only update/delete/upload for their own college's question papers

---

## 📊 Health & Utility Routes

### 1. Health Check
```http
GET /health
```
*No Authentication Required*

**Response:**
```json
{
  "success": true,
  "message": "Educational Book Subscription API is running",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

---

## 🔒 Role-Based Access Summary

### Super Admin (`super_admin`)
- ✅ All system operations
- ✅ Manage all colleges, users, books
- ✅ System settings management
- ✅ View all analytics and reports

### College Admin (`college_admin`)
- ✅ Manage their college's users and books
- ✅ View their college's statistics
- ✅ Upload/manage books for their college
- ❌ Cannot access other colleges' data
- ❌ Cannot manage system settings

### Student (`student`)
- ✅ View books from their college
- ✅ Download/access books from their college
- ✅ Update their own profile
- ❌ Cannot manage books or other users
- ❌ Cannot access admin functions

### Individual User (`user`)
- ✅ View all books from all colleges
- ✅ Purchase books via Razorpay payment gateway
- ✅ View purchased books with PDF access
- ✅ Download/access purchased books
- ✅ Update their own profile
- ❌ Cannot manage books or other users
- ❌ Cannot access admin functions
- ❌ Not associated with any college

---

## 📝 Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Pagination Format
```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🚨 Common Error Codes

### General Errors
- `AUTH_REQUIRED`: Authentication token required
- `ACCESS_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists
- `SERVER_ERROR`: Internal server error
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Question Paper Specific Errors
- `QUESTION_PAPER_NOT_FOUND`: Question paper does not exist
- `INSUFFICIENT_PERMISSIONS`: Role not authorized for this operation
- `NO_FILE`: No PDF file provided in upload request
- `INVALID_FILE_TYPE`: File is not a PDF
- `FILE_TOO_LARGE`: File exceeds 50MB limit
- `NO_PDF`: Question paper has no PDF attached
- `UPLOAD_ERROR`: S3 upload failed
- `NO_COLLEGE_ASSOCIATION`: User must be associated with a college
- `COLLEGE_NOT_FOUND`: College does not exist
- `INVALID_COLLEGE`: Invalid or inactive college specified
- `URL_GENERATION_FAILED`: Failed to generate signed URL

---

## 📋 Field Validation Rules

### User Fields
- `email`: Valid email format, unique
- `password`: Minimum 6 characters
- `full_name`: 2-255 characters
- `role`: Must be one of: super_admin, college_admin, student
- `mobile`: Valid phone number format

### Book Fields
- `name`: 1-255 characters, required
- `authorname`: Required
- `year`: 2020-2030, required
- `semester`: 1-8, required
- `rate`: 0.0-5.0
- `isbn`: Valid ISBN format (optional)

### College Fields
- `name`: 2-255 characters, required
- `code`: 2-20 characters, uppercase, unique
- `email`: Valid email format, unique

### Question Paper Fields
- `title`: 1-500 characters, required
- `subject`: 1-100 characters, required
- `year`: 1-4 (undergraduate years), required
- `semester`: 1-8, required
- `exam_type`: Must be one of: midterm, final, quiz, practice (optional)
- `marks`: Minimum 0 (optional)
- `description`: Text, optional
- `college_id`: Valid UUID (optional for super_admin, auto-set for college_admin)

This documentation covers all the API endpoints with their required authentication, request bodies, and expected responses. The system is designed to handle educational book management with proper role-based access control.