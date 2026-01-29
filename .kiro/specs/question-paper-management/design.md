# Question Paper Management Feature - Design

## Architecture Overview

The question paper management system follows the same architectural pattern as the book feature, implementing a three-tier architecture:

1. **Presentation Layer**: RESTful API endpoints with Express.js routes
2. **Business Logic Layer**: Controller and service classes handling business rules
3. **Data Layer**: Sequelize ORM models with PostgreSQL database

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Routes                         │
│  /api/question-papers/* (questionPapers.js)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                           │
│  - authenticateToken (JWT validation)                        │
│  - requireAdmin (role check)                                 │
│  - requireQuestionPaperAccess (permission check)            │
│  - uploadQuestionPaperFile (Multer file handling)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              QuestionPaperController                         │
│  - createQuestionPaper()                                     │
│  - getQuestionPapers() (role-based filtering)               │
│  - getQuestionPaper()                                        │
│  - updateQuestionPaper()                                     │
│  - deleteQuestionPaper()                                     │
│  - uploadQuestionPaperPdf()                                  │
│  - refreshPdfAccessUrl()                                     │
│  - logQuestionPaperAccess()                                  │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  QuestionPaper Model   │  │  FileUploadService           │
│  (Sequelize ORM)       │  │  - uploadQuestionPaperPdf()  │
└────────────┬───────────┘  └──────────────┬───────────────┘
             │                              │
             ▼                              ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  PostgreSQL Database   │  │  AWS S3 Storage              │
│  - question_papers     │  │  - question-papers/pdfs/     │
│  - question_paper_     │  │                              │
│    access_logs         │  │                              │
└────────────────────────┘  └──────────────────────────────┘
```

## Data Model Design

### QuestionPaper Model

```javascript
{
  id: UUID (PK),
  title: STRING(500) NOT NULL,
  description: TEXT,
  subject: STRING(100) NOT NULL,
  year: INTEGER NOT NULL (1-4),
  semester: INTEGER NOT NULL (1-8),
  exam_type: ENUM('midterm', 'final', 'quiz', 'practice'),
  marks: INTEGER,
  pdf_url: TEXT,
  college_id: UUID (FK -> colleges.id, nullable),
  is_active: BOOLEAN DEFAULT true,
  created_by: UUID (FK -> users.id),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

**Indexes:**
- `idx_question_papers_college_id` on `college_id`
- `idx_question_papers_year` on `year`
- `idx_question_papers_semester` on `semester`
- `idx_question_papers_subject` on `subject`
- `idx_question_papers_created_by` on `created_by`
- `idx_question_papers_is_active` on `is_active`

**Constraints:**
- `year` must be between 1 and 4
- `semester` must be between 1 and 8
- `title` must not be empty
- `subject` must not be empty

### QuestionPaperAccessLog Model

```javascript
{
  id: UUID (PK),
  user_id: UUID (FK -> users.id) NOT NULL,
  question_paper_id: UUID (FK -> question_papers.id) NOT NULL,
  access_type: STRING(20) DEFAULT 'view',
  accessed_at: TIMESTAMP DEFAULT NOW(),
  ip_address: INET,
  user_agent: TEXT
}
```

**Indexes:**
- `idx_qp_access_logs_user_id` on `user_id`
- `idx_qp_access_logs_question_paper_id` on `question_paper_id`
- `idx_qp_access_logs_accessed_at` on `accessed_at`

### Database Relationships

```
users (1) ──────< (N) question_papers (created_by)
colleges (1) ────< (N) question_papers (college_id, nullable)
users (1) ───────< (N) question_paper_access_logs
question_papers (1) ──< (N) question_paper_access_logs
```

## Business Logic Design

### Role-Based Access Control

#### Access Matrix

| Role          | Create | Read (All) | Read (Own College) | Read (Own Year) | Update | Delete |
|---------------|--------|------------|-------------------|-----------------|--------|--------|
| super_admin   | ✓      | ✓          | ✓                 | ✓               | ✓      | ✓      |
| college_admin | ✓      | ✗          | ✓                 | ✓               | ✓*     | ✓*     |
| student       | ✗      | ✗          | ✗                 | ✓               | ✗      | ✗      |
| user          | ✗      | ✓          | ✓                 | ✓               | ✗      | ✗      |

*College admins can only update/delete question papers for their own college

#### Access Control Logic

```javascript
// QuestionPaper.isAccessibleBy(user)
function isAccessibleBy(user) {
  // Super admin → full access
  if (user.role === 'super_admin') return true;

  // Global question papers (no college_id) → everyone
  if (!this.college_id) return true;

  // College-based question papers
  if (this.college_id) {
    if (!user.collegeId) return false;
    
    // College must match
    if (this.college_id !== user.collegeId) return false;

    // College admin → all papers in their college
    if (user.role === 'college_admin') return true;

    // User role → all papers in any college
    if (user.role === 'user') return true;

    // Student → must match year
    if (user.role === 'student') {
      if (!user.year) return false;
      if (user.year !== this.year) return false;
      return true;
    }
  }

  return false;
}
```

### File Upload Flow

```
1. Client sends POST /api/question-papers/:id/upload-pdf
   ├─ Multipart form data with PDF file
   └─ JWT token in Authorization header

2. Middleware validation
   ├─ authenticateToken: Validate JWT
   ├─ requireAdmin: Check role (super_admin or college_admin)
   └─ uploadQuestionPaperFile: Multer processes file
       ├─ Validate file type (application/pdf)
       ├─ Validate file size (max 50MB)
       └─ Store in memory buffer

3. Controller processing
   ├─ Find question paper by ID
   ├─ Verify admin has permission
   ├─ Delete old PDF from S3 (if exists)
   └─ Upload new PDF to S3
       ├─ Generate unique key: question-papers/pdfs/{id}/{timestamp}-{uuid}.pdf
       ├─ Upload to S3 with metadata
       └─ Update question paper record with S3 URL

4. Response
   ├─ Return success with signed URL (1 hour expiry)
   └─ Include question_paper_id, pdf_url, original_name
```

### Signed URL Generation

```javascript
// Generate signed URL for secure PDF access
function generatePdfAccessUrl(pdfUrl, expirySeconds = 3600) {
  // Extract S3 key from URL
  const key = extractS3Key(pdfUrl);
  
  // Generate signed URL using AWS SDK
  return s3.getSignedUrl('getObject', {
    Bucket: S3_CONFIG.bucket,
    Key: key,
    Expires: expirySeconds // 1 hour default
  });
}
```

### Query Filtering Logic

```javascript
// Build WHERE clause based on role and filters
function buildWhereClause(user, filters) {
  let where = { is_active: true };

  // Apply role-based filtering
  switch (user.role) {
    case 'super_admin':
    case 'user':
      // No college restriction
      break;
      
    case 'college_admin':
      where.college_id = user.collegeId;
      break;
      
    case 'student':
      where.college_id = user.collegeId;
      where.year = user.year;
      break;
  }

  // Apply query filters
  if (filters.subject) where.subject = filters.subject;
  if (filters.year) where.year = parseInt(filters.year);
  if (filters.semester) where.semester = parseInt(filters.semester);
  if (filters.exam_type) where.exam_type = filters.exam_type;

  return where;
}
```

## API Design

### Endpoint Specifications

#### POST /api/question-papers
**Purpose**: Create new question paper  
**Auth**: Required (super_admin, college_admin)  
**Request Body**:
```json
{
  "title": "Midterm Exam - Data Structures",
  "description": "Midterm examination covering arrays, linked lists, stacks, and queues",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100,
  "college_id": "uuid-here" // Optional for super_admin
}
```
**Response**: 201 Created
```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "question_paper": { /* question paper object */ }
  }
}
```

#### GET /api/question-papers
**Purpose**: List question papers (role-based filtering)  
**Auth**: Required (all roles)  
**Query Parameters**:
- `subject` (optional): Filter by subject
- `year` (optional): Filter by year
- `semester` (optional): Filter by semester
- `exam_type` (optional): Filter by exam type

**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "question_papers": [
      {
        "id": "uuid",
        "title": "Midterm Exam - Data Structures",
        "subject": "Data Structures",
        "year": 2,
        "semester": 3,
        "exam_type": "midterm",
        "marks": 100,
        "pdf_access_url": "https://s3.amazonaws.com/...",
        "college": { "id": "uuid", "name": "ABC College" },
        "created_at": "2026-01-25T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### GET /api/question-papers/:id
**Purpose**: Get single question paper  
**Auth**: Required (must have access)  
**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "question_paper": {
      "id": "uuid",
      "title": "Midterm Exam - Data Structures",
      "description": "...",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "pdf_access_url": "https://s3.amazonaws.com/...",
      "college": { "id": "uuid", "name": "ABC College" },
      "creator": { "id": "uuid", "full_name": "Admin User" },
      "created_at": "2026-01-25T10:00:00Z",
      "updated_at": "2026-01-25T10:00:00Z"
    }
  }
}
```

#### POST /api/question-papers/:id/upload-pdf
**Purpose**: Upload PDF file  
**Auth**: Required (super_admin, college_admin)  
**Content-Type**: multipart/form-data  
**Form Fields**:
- `question_paper`: PDF file (max 50MB)

**Response**: 200 OK
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "uuid",
    "pdf_url": "https://s3.amazonaws.com/...",
    "signed_url": "https://s3.amazonaws.com/...?X-Amz-...",
    "original_name": "midterm-exam.pdf"
  }
}
```

#### GET /api/question-papers/:id/refresh-url
**Purpose**: Refresh expired signed URL  
**Auth**: Required (must have access)  
**Response**: 200 OK
```json
{
  "success": true,
  "data": {
    "question_paper_id": "uuid",
    "pdf_access_url": "https://s3.amazonaws.com/...?X-Amz-...",
    "expires_in": 3600
  }
}
```

#### PUT /api/question-papers/:id
**Purpose**: Update question paper metadata  
**Auth**: Required (super_admin, college_admin)  
**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "marks": 120
}
```
**Response**: 200 OK

#### DELETE /api/question-papers/:id
**Purpose**: Soft delete question paper  
**Auth**: Required (super_admin, college_admin)  
**Response**: 200 OK

#### POST /api/question-papers/:id/access
**Purpose**: Log access event  
**Auth**: Required (must have access)  
**Request Body**:
```json
{
  "access_type": "view" // or "download"
}
```
**Response**: 200 OK

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": "Additional details (development only)"
}
```

### Error Codes
- `QUESTION_PAPER_NOT_FOUND` (404): Question paper does not exist
- `ACCESS_DENIED` (403): User lacks permission
- `INSUFFICIENT_PERMISSIONS` (403): Role not authorized
- `NO_FILE` (400): No PDF file provided
- `INVALID_FILE_TYPE` (400): File is not a PDF
- `FILE_TOO_LARGE` (400): File exceeds 50MB limit
- `NO_PDF` (404): Question paper has no PDF attached
- `UPLOAD_ERROR` (500): S3 upload failed
- `SERVER_ERROR` (500): Internal server error

## Security Considerations

### Authentication & Authorization
- All endpoints require valid JWT token
- Role-based access control enforced at controller level
- Permission checks before file operations

### File Security
- PDFs stored in private S3 bucket
- Signed URLs with 1-hour expiration
- No direct S3 URLs exposed to clients
- File type and size validation before upload

### Data Validation
- Input sanitization for all user-provided data
- Sequelize validation for model fields
- Multer validation for file uploads

## Performance Optimization

### Database Optimization
- Indexes on frequently queried fields (college_id, year, semester, subject)
- Eager loading of related models (college, creator)
- Pagination for large result sets (future enhancement)

### S3 Optimization
- Streaming uploads for large files
- Parallel file operations where possible
- Caching of signed URLs (client-side)

### Caching Strategy (Future Enhancement)
- Cache frequently accessed question papers metadata
- Cache signed URLs with TTL matching expiration
- Invalidate cache on updates

## Testing Strategy

### Unit Tests
- Model validation tests
- Access control logic tests
- URL generation tests
- File validation tests

### Integration Tests
- API endpoint tests with different roles
- File upload and download flows
- Role-based filtering tests
- Error handling tests

### Test Coverage Goals
- Minimum 80% code coverage
- All critical paths tested
- All error scenarios tested

## Correctness Properties

### CP-1: Access Control Invariant
**Property**: A user can only access question papers they have permission to view  
**Verification**: For all users U and question papers QP, if U.canAccess(QP) returns false, then any API call to retrieve QP by U must return 403 Forbidden

### CP-2: File Integrity
**Property**: Uploaded PDF files are stored exactly once in S3 with unique keys  
**Verification**: For all uploads, the generated S3 key must be unique and the file must be retrievable using that key

### CP-3: Signed URL Expiration
**Property**: Signed URLs expire after the specified duration  
**Verification**: For all signed URLs with expiry time T, accessing the URL after time T must result in an access denied error from S3

### CP-4: Soft Delete Consistency
**Property**: Deleted question papers are not returned in queries but remain in database  
**Verification**: After DELETE operation, is_active = false AND question paper is not in GET /api/question-papers results

### CP-5: Role-Based Filtering
**Property**: Students only see question papers for their college and year  
**Verification**: For all students S with college C and year Y, GET /api/question-papers returns only papers where college_id = C AND year = Y

### CP-6: Admin Scope Restriction
**Property**: College admins can only modify question papers for their college  
**Verification**: For all college admins A with college C, UPDATE/DELETE operations on papers with college_id ≠ C must return 403 Forbidden

## Deployment Considerations

### Environment Variables
```
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=<region>
AWS_S3_BUCKET=<bucket-name>
```

### Database Migration
- Run migration to create `question_papers` table
- Run migration to create `question_paper_access_logs` table
- Create indexes for performance

### S3 Bucket Configuration
- Create folder structure: `question-papers/pdfs/`
- Set bucket policy for private access
- Configure CORS if needed for direct uploads (future)

## Future Enhancements
- Question paper versioning
- Bulk upload of question papers
- Question paper analytics dashboard
- Question paper sharing between colleges
- Question paper categories/tags
- Advanced search with full-text search
- Question paper preview without download
