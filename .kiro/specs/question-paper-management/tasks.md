# Question Paper Management Feature - Implementation Tasks

## Task Overview

This document outlines the implementation tasks for the question paper management feature. Tasks should be completed in order as they have dependencies.

**Total Estimated Time**: 8-10 hours  
**Priority**: High  
**Dependencies**: Existing authentication, authorization, file upload middleware, AWS S3 configuration

---

## Task 1: Database Schema and Migration

**Estimated Time**: 45 minutes  
**Priority**: High  
**Dependencies**: None  
**Requirements**: FR-1, NFR-2

### Description
Create database tables for question papers and access logs with appropriate indexes and constraints.

### Acceptance Criteria
- [ ] `question_papers` table created with all required fields
- [ ] `question_paper_access_logs` table created
- [ ] All indexes created for performance optimization
- [ ] Foreign key constraints properly defined
- [ ] Triggers for `updated_at` timestamp created
- [ ] Migration file can be run and rolled back successfully

### Implementation Steps
1. Create migration file: `database/migrations/create_question_papers_tables.sql`
2. Define `question_papers` table with fields:
   - id (UUID, PK)
   - title (VARCHAR 500, NOT NULL)
   - description (TEXT)
   - subject (VARCHAR 100, NOT NULL)
   - year (INTEGER, NOT NULL, CHECK 1-4)
   - semester (INTEGER, NOT NULL, CHECK 1-8)
   - exam_type (ENUM: midterm, final, quiz, practice)
   - marks (INTEGER)
   - pdf_url (TEXT)
   - college_id (UUID, FK, nullable)
   - is_active (BOOLEAN, DEFAULT true)
   - created_by (UUID, FK)
   - created_at, updated_at (TIMESTAMP)
3. Define `question_paper_access_logs` table
4. Create indexes on: college_id, year, semester, subject, created_by, is_active
5. Add triggers for updated_at timestamp
6. Update `database/schema.sql` with new tables

### Files to Create/Modify
- `database/migrations/create_question_papers_tables.sql` (new)
- `database/schema.sql` (modify)

---

## Task 2: QuestionPaper Sequelize Model

**Estimated Time**: 1 hour  
**Priority**: High  
**Dependencies**: Task 1  
**Requirements**: FR-1, FR-3, CP-1

### Description
Create Sequelize model for QuestionPaper with validation, instance methods, and class methods.

### Acceptance Criteria
- [ ] QuestionPaper model defined with all fields and validations
- [ ] `isAccessibleBy(user)` instance method implements role-based access control
- [ ] `toSafeJSON()` instance method for safe data serialization
- [ ] Class methods for common queries (findByCollege, findByYear, etc.)
- [ ] Scopes defined for filtering (active, forCollege, forYear, forSemester)
- [ ] Model associations defined (User, College)
- [ ] All validations working correctly

### Implementation Steps
1. Create `src/models/QuestionPaper.js`
2. Define model with DataTypes matching database schema
3. Add field validations:
   - title: notEmpty, len[1, 500]
   - subject: notEmpty, len[1, 100]
   - year: min 1, max 4
   - semester: min 1, max 8
   - marks: min 0 (if provided)
4. Implement `isAccessibleBy(user)` method with role-based logic
5. Implement `toSafeJSON()` method
6. Add class methods: `findByCollege`, `findByYear`, `findBySubject`
7. Define scopes: active, forCollege, forYear, forSemester, bySubject
8. Update `src/models/index.js` to export QuestionPaper model

### Files to Create/Modify
- `src/models/QuestionPaper.js` (new)
- `src/models/index.js` (modify - add QuestionPaper export)

---

## Task 3: QuestionPaperAccessLog Model

**Estimated Time**: 30 minutes  
**Priority**: Medium  
**Dependencies**: Task 1, Task 2  
**Requirements**: FR-8

### Description
Create Sequelize model for logging question paper access events.

### Acceptance Criteria
- [ ] QuestionPaperAccessLog model defined with all fields
- [ ] Associations with User and QuestionPaper models
- [ ] Default values set correctly (access_type, accessed_at)
- [ ] Model exported and available for use

### Implementation Steps
1. Create `src/models/QuestionPaperAccessLog.js`
2. Define model with fields: id, user_id, question_paper_id, access_type, accessed_at, ip_address, user_agent
3. Set default values: access_type='view', accessed_at=NOW()
4. Define associations with User and QuestionPaper
5. Update `src/models/index.js` to export QuestionPaperAccessLog

### Files to Create/Modify
- `src/models/QuestionPaperAccessLog.js` (new)
- `src/models/index.js` (modify - add QuestionPaperAccessLog export)

---

## Task 4: File Upload Service Extension

**Estimated Time**: 45 minutes  
**Priority**: High  
**Dependencies**: None  
**Requirements**: FR-2, NFR-1, CP-2

### Description
Extend fileUploadService to support question paper PDF uploads with validation and S3 storage.

### Acceptance Criteria
- [ ] `uploadQuestionPaperPdf()` method added to fileUploadService
- [ ] File validation for PDF type and 50MB size limit
- [ ] S3 upload to `question-papers/pdfs/{id}/` path
- [ ] Unique filename generation with timestamp and UUID
- [ ] Returns upload result with public URL and signed URL
- [ ] Error handling for upload failures

### Implementation Steps
1. Open `src/services/fileUploadService.js`
2. Add `uploadQuestionPaperPdf(file, questionPaperId)` method
3. Validate file type (application/pdf) and size (max 50MB)
4. Generate unique S3 key: `question-papers/pdfs/{id}/{timestamp}-{uuid}.pdf`
5. Upload to S3 with appropriate metadata
6. Return upload result with URLs
7. Update S3_CONFIG in `src/config/aws.js` to include question paper paths

### Files to Modify
- `src/services/fileUploadService.js` (modify)
- `src/config/aws.js` (modify - add question paper paths to S3_CONFIG)

---

## Task 5: QuestionPaper Controller - CRUD Operations

**Estimated Time**: 2 hours  
**Priority**: High  
**Dependencies**: Task 2, Task 3  
**Requirements**: FR-1, FR-3, FR-5, FR-6, FR-7

### Description
Create controller with CRUD operations for question papers including role-based access control.

### Acceptance Criteria
- [ ] `createQuestionPaper()` - Creates new question paper with permission checks
- [ ] `getQuestionPapers()` - Lists question papers with role-based filtering
- [ ] `getQuestionPaper()` - Gets single question paper with access check
- [ ] `updateQuestionPaper()` - Updates metadata with permission checks
- [ ] `deleteQuestionPaper()` - Soft deletes with S3 cleanup
- [ ] All methods have proper error handling
- [ ] All methods return consistent response format
- [ ] Role-based access control enforced in all methods

### Implementation Steps
1. Create `src/controllers/questionPaperController.js`
2. Implement `createQuestionPaper(req, res)`:
   - Validate user role (super_admin, college_admin)
   - Determine college_id based on role
   - Validate required fields (title, subject, year, semester)
   - Create question paper record
   - Return success response
3. Implement `getQuestionPapers(req, res)`:
   - Build WHERE clause based on user role
   - Apply query filters (subject, year, semester, exam_type)
   - Include College and User associations
   - Add signed URLs for PDFs
   - Return filtered results
4. Implement `getQuestionPaper(req, res)`:
   - Find question paper by ID
   - Check access with `isAccessibleBy(user)`
   - Add signed URL for PDF
   - Return question paper data
5. Implement `updateQuestionPaper(req, res)`:
   - Validate permissions
   - Filter allowed updates
   - Update record
   - Return updated data
6. Implement `deleteQuestionPaper(req, res)`:
   - Validate permissions
   - Soft delete (set is_active=false)
   - Attempt S3 file deletion (don't fail if it fails)
   - Return success response

### Files to Create
- `src/controllers/questionPaperController.js` (new)

---

## Task 6: QuestionPaper Controller - File Operations

**Estimated Time**: 1.5 hours  
**Priority**: High  
**Dependencies**: Task 4, Task 5  
**Requirements**: FR-2, FR-4, CP-2, CP-3

### Description
Add file upload and signed URL management methods to the controller.

### Acceptance Criteria
- [ ] `uploadQuestionPaperPdf()` - Handles PDF upload with validation
- [ ] `refreshPdfAccessUrl()` - Generates new signed URL
- [ ] `_generatePdfAccessUrl()` - Helper for signed URL generation
- [ ] `_addFileUrlsToQuestionPaper()` - Helper to add signed URLs to response
- [ ] Old files deleted from S3 when new files uploaded
- [ ] Signed URLs expire after 1 hour
- [ ] Error handling for S3 operations

### Implementation Steps
1. Open `src/controllers/questionPaperController.js`
2. Implement `uploadQuestionPaperPdf(req, res)`:
   - Validate file exists
   - Find question paper by ID
   - Check permissions
   - Delete old PDF from S3 if exists
   - Upload new PDF using fileUploadService
   - Update question paper record with S3 URL
   - Return success with signed URL
3. Implement `refreshPdfAccessUrl(req, res)`:
   - Find question paper by ID
   - Check access permissions
   - Generate new signed URL (1 hour expiry)
   - Return new URL
4. Implement `_generatePdfAccessUrl(pdfUrl, expirySeconds)` helper
5. Implement `_addFileUrlsToQuestionPaper(questionPaper)` helper

### Files to Modify
- `src/controllers/questionPaperController.js` (modify)

---

## Task 7: QuestionPaper Controller - Access Logging

**Estimated Time**: 30 minutes  
**Priority**: Medium  
**Dependencies**: Task 3, Task 5  
**Requirements**: FR-8

### Description
Implement access logging functionality to track views and downloads.

### Acceptance Criteria
- [ ] `logQuestionPaperAccess()` method implemented
- [ ] Logs user_id, question_paper_id, access_type, timestamp, IP, user agent
- [ ] Access check performed before logging
- [ ] Error handling for logging failures

### Implementation Steps
1. Open `src/controllers/questionPaperController.js`
2. Implement `logQuestionPaperAccess(req, res)`:
   - Extract access_type from request body (default: 'view')
   - Find question paper by ID
   - Check access with `isAccessibleBy(user)`
   - Create access log entry with QuestionPaperAccessLog model
   - Return success response
3. Export controller as singleton

### Files to Modify
- `src/controllers/questionPaperController.js` (modify)

---

## Task 8: Question Paper Routes

**Estimated Time**: 1 hour  
**Priority**: High  
**Dependencies**: Task 5, Task 6, Task 7  
**Requirements**: All FR requirements

### Description
Create Express routes for question paper endpoints with middleware integration.

### Acceptance Criteria
- [ ] All CRUD endpoints defined
- [ ] File upload endpoints configured with Multer
- [ ] Authentication middleware applied to all routes
- [ ] Authorization middleware applied appropriately
- [ ] Query parameter filtering supported
- [ ] Error handling middleware configured
- [ ] Routes follow RESTful conventions

### Implementation Steps
1. Create `src/routes/questionPapers.js`
2. Define routes:
   - `POST /` - Create question paper (admin only)
   - `GET /` - List question papers (authenticated)
   - `GET /:id` - Get single question paper (authenticated, access check)
   - `PUT /:id` - Update question paper (admin only)
   - `DELETE /:id` - Delete question paper (admin only)
   - `POST /:id/upload-pdf` - Upload PDF (admin only, Multer)
   - `GET /:id/refresh-url` - Refresh signed URL (authenticated, access check)
   - `POST /:id/access` - Log access (authenticated, access check)
3. Apply middleware:
   - `authenticateToken` on all routes
   - `requireAdmin` on admin-only routes
   - `requireQuestionPaperAccess` on access-restricted routes
   - `uploadQuestionPaperFile` on upload routes
4. Add error handling middleware
5. Update `src/server.js` to mount routes at `/api/question-papers`

### Files to Create/Modify
- `src/routes/questionPapers.js` (new)
- `src/server.js` (modify - mount question paper routes)

---

## Task 9: Middleware for Question Paper Access Control

**Estimated Time**: 45 minutes  
**Priority**: High  
**Dependencies**: Task 2  
**Requirements**: FR-3, CP-1, CP-6

### Description
Create middleware to check if user has access to specific question paper.

### Acceptance Criteria
- [ ] `requireQuestionPaperAccess` middleware created
- [ ] Checks if question paper exists
- [ ] Validates user has access using `isAccessibleBy()`
- [ ] Returns 403 if access denied
- [ ] Returns 404 if question paper not found
- [ ] Attaches question paper to request object for downstream use

### Implementation Steps
1. Open `src/middleware/rbac.js` (or create if doesn't exist)
2. Implement `requireQuestionPaperAccess` middleware:
   - Extract questionPaperId from req.params
   - Find question paper by ID
   - Return 404 if not found
   - Check access with `questionPaper.isAccessibleBy(req.user)`
   - Return 403 if access denied
   - Attach question paper to req.questionPaper
   - Call next()
3. Export middleware

### Files to Modify
- `src/middleware/rbac.js` (modify or create)

---

## Task 10: File Upload Middleware for Question Papers

**Estimated Time**: 30 minutes  
**Priority**: High  
**Dependencies**: None  
**Requirements**: FR-2, NFR-1

### Description
Create or extend Multer middleware for question paper PDF uploads.

### Acceptance Criteria
- [ ] `uploadQuestionPaperFile` middleware created
- [ ] Accepts 'question_paper' field name
- [ ] Validates file type (PDF only)
- [ ] Validates file size (max 50MB)
- [ ] Uses memory storage for S3 upload
- [ ] Error handling for invalid files

### Implementation Steps
1. Open `src/middleware/fileUpload.js`
2. Create `uploadQuestionPaperFile` middleware using Multer:
   - Configure memory storage
   - Set file size limit: 50MB
   - Set file filter: application/pdf only
   - Field name: 'question_paper'
3. Export middleware

### Files to Modify
- `src/middleware/fileUpload.js` (modify)

---

## Task 11: Unit Tests - QuestionPaper Model

**Estimated Time**: 1.5 hours  
**Priority**: High  
**Dependencies**: Task 2  
**Requirements**: CP-1, CP-5

### Description
Write comprehensive unit tests for QuestionPaper model including validation and access control.

### Acceptance Criteria
- [ ] Model creation tests
- [ ] Field validation tests (title, subject, year, semester)
- [ ] `isAccessibleBy()` tests for all roles
- [ ] Class method tests (findByCollege, findByYear, etc.)
- [ ] Scope tests
- [ ] Association tests
- [ ] All tests passing
- [ ] Minimum 90% coverage for model

### Implementation Steps
1. Create `src/models/__tests__/QuestionPaper.test.js`
2. Write test suites:
   - Model creation and validation
   - Access control for super_admin (full access)
   - Access control for college_admin (college-scoped)
   - Access control for student (college + year scoped)
   - Access control for user (all access)
   - Class methods
   - Scopes
3. Use Jest and Sequelize test utilities
4. Mock database connections where appropriate

### Files to Create
- `src/models/__tests__/QuestionPaper.test.js` (new)

---

## Task 12: Integration Tests - QuestionPaper Controller

**Estimated Time**: 2 hours  
**Priority**: High  
**Dependencies**: Task 5, Task 6, Task 7  
**Requirements**: All FR requirements, CP-1, CP-4, CP-5, CP-6

### Description
Write integration tests for all controller methods with different user roles.

### Acceptance Criteria
- [ ] Tests for createQuestionPaper with different roles
- [ ] Tests for getQuestionPapers with role-based filtering
- [ ] Tests for getQuestionPaper with access control
- [ ] Tests for updateQuestionPaper with permissions
- [ ] Tests for deleteQuestionPaper with permissions
- [ ] Tests for uploadQuestionPaperPdf
- [ ] Tests for refreshPdfAccessUrl
- [ ] Tests for logQuestionPaperAccess
- [ ] All tests passing
- [ ] Minimum 85% coverage for controller

### Implementation Steps
1. Create test files:
   - `src/controllers/__tests__/questionPaperController.create.test.js`
   - `src/controllers/__tests__/questionPaperController.read.test.js`
   - `src/controllers/__tests__/questionPaperController.update.test.js`
   - `src/controllers/__tests__/questionPaperController.delete.test.js`
   - `src/controllers/__tests__/questionPaperController.upload.test.js`
2. Write test cases for each role:
   - Super admin: full access
   - College admin: college-scoped access
   - Student: college + year scoped access
   - User: full read access, no write access
3. Test error scenarios:
   - Invalid permissions
   - Missing files
   - Invalid file types
   - Question paper not found
4. Mock S3 operations
5. Use supertest for HTTP testing

### Files to Create
- `src/controllers/__tests__/questionPaperController.create.test.js` (new)
- `src/controllers/__tests__/questionPaperController.read.test.js` (new)
- `src/controllers/__tests__/questionPaperController.update.test.js` (new)
- `src/controllers/__tests__/questionPaperController.delete.test.js` (new)
- `src/controllers/__tests__/questionPaperController.upload.test.js` (new)

---

## Task 13: Integration Tests - Question Paper Routes

**Estimated Time**: 1.5 hours  
**Priority**: Medium  
**Dependencies**: Task 8  
**Requirements**: All FR requirements

### Description
Write end-to-end integration tests for question paper API routes.

### Acceptance Criteria
- [ ] Tests for all endpoints with authentication
- [ ] Tests for middleware integration
- [ ] Tests for file upload flow
- [ ] Tests for error responses
- [ ] All tests passing
- [ ] Minimum 80% coverage for routes

### Implementation Steps
1. Create `src/routes/__tests__/questionPapers.test.js`
2. Write test suites:
   - POST /api/question-papers (create)
   - GET /api/question-papers (list with filters)
   - GET /api/question-papers/:id (get single)
   - PUT /api/question-papers/:id (update)
   - DELETE /api/question-papers/:id (delete)
   - POST /api/question-papers/:id/upload-pdf (upload)
   - GET /api/question-papers/:id/refresh-url (refresh URL)
   - POST /api/question-papers/:id/access (log access)
3. Test with different user roles
4. Test error scenarios (401, 403, 404, 400, 500)
5. Mock database and S3 operations

### Files to Create
- `src/routes/__tests__/questionPapers.test.js` (new)

---

## Task 14: API Documentation

**Estimated Time**: 1 hour  
**Priority**: Medium  
**Dependencies**: Task 8  
**Requirements**: All FR requirements

### Description
Document all question paper API endpoints with request/response examples.

### Acceptance Criteria
- [ ] All endpoints documented
- [ ] Request/response examples provided
- [ ] Authentication requirements specified
- [ ] Error responses documented
- [ ] Query parameters explained
- [ ] File upload format documented

### Implementation Steps
1. Open `API_DOCUMENTATION.md`
2. Add section: "Question Paper Management API"
3. Document each endpoint:
   - HTTP method and path
   - Description
   - Authentication requirements
   - Request parameters/body
   - Response format
   - Error responses
   - Example requests/responses
4. Add examples using curl or similar

### Files to Modify
- `API_DOCUMENTATION.md` (modify)

---

## Task 15: Manual Testing and Validation

**Estimated Time**: 1.5 hours  
**Priority**: High  
**Dependencies**: All previous tasks  
**Requirements**: All requirements

### Description
Perform manual testing of the complete question paper feature with different user roles.

### Acceptance Criteria
- [ ] Super admin can create, read, update, delete all question papers
- [ ] College admin can manage only their college's question papers
- [ ] Students can only view question papers for their college and year
- [ ] Individual users can view all question papers
- [ ] PDF upload works correctly
- [ ] Signed URLs expire after 1 hour
- [ ] URL refresh works correctly
- [ ] Access logging works correctly
- [ ] All error scenarios handled gracefully

### Testing Checklist
1. Create test users for each role (super_admin, college_admin, student, user)
2. Test question paper creation:
   - Super admin creates global question paper
   - Super admin creates college-specific question paper
   - College admin creates question paper for their college
   - College admin cannot create for other college
3. Test question paper listing:
   - Super admin sees all
   - College admin sees only their college
   - Student sees only their college + year
   - User sees all
4. Test PDF upload:
   - Upload valid PDF (< 50MB)
   - Try invalid file type (should fail)
   - Try oversized file (should fail)
   - Verify file in S3
5. Test signed URL:
   - Access PDF with signed URL
   - Wait for expiration (or manipulate timestamp)
   - Verify expired URL fails
   - Refresh URL and verify new URL works
6. Test access logging:
   - View question paper
   - Verify log entry created
7. Test update/delete:
   - Admin updates question paper
   - Admin deletes question paper
   - Verify soft delete (is_active=false)
8. Test error scenarios:
   - Unauthorized access
   - Invalid question paper ID
   - Missing required fields

### Files to Create
- `TEST_QUESTION_PAPERS.md` (new - manual testing report)

---

## Task Completion Checklist

### Phase 1: Foundation (Tasks 1-4)
- [x] Task 1: Database Schema and Migration
- [x] Task 2: QuestionPaper Sequelize Model
- [x] Task 3: QuestionPaperAccessLog Model
- [x] Task 4: File Upload Service Extension

### Phase 2: Business Logic (Tasks 5-7)
- [x] Task 5: QuestionPaper Controller - CRUD Operations
- [x] Task 6: QuestionPaper Controller - File Operations
- [x] Task 7: QuestionPaper Controller - Access Logging

### Phase 3: API Layer (Tasks 8-10)
- [x] Task 8: Question Paper Routes
- [x] Task 9: Middleware for Question Paper Access Control
- [x] Task 10: File Upload Middleware for Question Papers

### Phase 4: Testing (Tasks 11-13)
- [ ] Task 11: Unit Tests - QuestionPaper Model
- [ ] Task 12: Integration Tests - QuestionPaper Controller
- [ ] Task 13: Integration Tests - Question Paper Routes

### Phase 5: Documentation & Validation (Tasks 14-15)
- [x] Task 14: API Documentation
- [ ] Task 15: Manual Testing and Validation

---

## Notes

### Testing Strategy
- Run unit tests after completing each model/controller
- Run integration tests after completing routes
- Aim for minimum 85% overall code coverage
- Use Jest for all testing
- Mock S3 operations in tests

### Code Quality
- Follow existing code style and patterns from book feature
- Use consistent error handling
- Add JSDoc comments for all public methods
- Use meaningful variable and function names
- Keep functions small and focused

### Git Workflow
- Create feature branch: `feature/question-paper-management`
- Commit after each task completion
- Write descriptive commit messages
- Create pull request after all tasks complete

### Deployment
- Run database migrations before deploying
- Verify S3 bucket configuration
- Test with production-like data
- Monitor error logs after deployment

---

## Success Criteria

The question paper management feature is complete when:
1. All 15 tasks are completed and checked off
2. All tests passing (unit + integration)
3. Code coverage meets minimum thresholds (85%+)
4. Manual testing validates all user stories
5. API documentation is complete
6. Code review approved
7. Successfully deployed to staging environment
