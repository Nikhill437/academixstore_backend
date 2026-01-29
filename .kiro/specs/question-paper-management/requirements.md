# Question Paper Management Feature - Requirements

## Overview
Implement a comprehensive question paper management system that mirrors the book feature functionality, enabling super admins and college admins to upload, manage, and distribute question papers to students and users with role-based access control and AWS S3 storage integration.

## Stakeholders
- **Super Admins**: Full access to all question papers across all colleges
- **College Admins**: Manage question papers for their specific college
- **Students**: Access question papers for their college and year
- **Individual Users**: Access all question papers from all colleges

## Requirements (EARS Format)

### Functional Requirements

#### FR-1: Question Paper Creation
**WHEN** a super admin or college admin creates a question paper  
**THEN** the system **SHALL** store the question paper metadata (title, description, subject, year, semester, college association)  
**AND** the system **SHALL** assign a unique UUID to the question paper  
**AND** the system **SHALL** record the creator's user ID and timestamp

#### FR-2: Question Paper File Upload
**WHEN** an admin uploads a PDF file for a question paper  
**THEN** the system **SHALL** validate the file type is PDF  
**AND** the system **SHALL** validate the file size does not exceed 50MB  
**AND** the system **SHALL** upload the file to AWS S3 in the `question-papers/pdfs/` path  
**AND** the system **SHALL** store the S3 URL in the question paper record

#### FR-3: Role-Based Access Control
**WHERE** a user requests access to question papers  
**WHEN** the user is a super admin  
**THEN** the system **SHALL** return all active question papers from all colleges

**WHERE** a user requests access to question papers  
**WHEN** the user is a college admin  
**THEN** the system **SHALL** return only question papers associated with their college

**WHERE** a user requests access to question papers  
**WHEN** the user is a student  
**THEN** the system **SHALL** return only question papers matching their college AND year

**WHERE** a user requests access to question papers  
**WHEN** the user is an individual user (role='user')  
**THEN** the system **SHALL** return all active question papers from all colleges

#### FR-4: Signed URL Generation
**WHEN** a user with appropriate permissions requests a question paper PDF  
**THEN** the system **SHALL** generate a time-limited signed URL (valid for 1 hour)  
**AND** the system **SHALL NOT** expose the direct S3 URL to the client  
**AND** the system **SHALL** allow URL refresh when the signed URL expires

#### FR-5: Question Paper Update
**WHEN** an admin updates question paper metadata  
**THEN** the system **SHALL** validate the admin has permission (super admin or college admin for their college)  
**AND** the system **SHALL** update only allowed fields (title, description, subject, year, semester, exam_type, marks)  
**AND** the system **SHALL** update the `updated_at` timestamp

#### FR-6: Question Paper Deletion
**WHEN** an admin deletes a question paper  
**THEN** the system **SHALL** perform a soft delete by setting `is_active` to false  
**AND** the system **SHALL** attempt to delete associated PDF files from S3  
**AND** the system **SHALL NOT** fail if S3 deletion fails (log warning only)

#### FR-7: Question Paper Filtering
**WHERE** users request question papers  
**WHEN** query parameters are provided (subject, year, semester, exam_type)  
**THEN** the system **SHALL** filter results based on the provided parameters  
**AND** the system **SHALL** apply role-based access control before filtering

#### FR-8: Question Paper Access Logging
**WHEN** a user views or downloads a question paper  
**THEN** the system **SHALL** log the access event with user ID, question paper ID, access type, timestamp, IP address, and user agent

### Non-Functional Requirements

#### NFR-1: Security
**The system SHALL** store PDF files in private S3 buckets requiring signed URLs for access  
**The system SHALL** validate user permissions before generating signed URLs  
**The system SHALL** hash and validate JWT tokens for authentication  
**The system SHALL** prevent unauthorized access to question papers from other colleges (for students and college admins)

#### NFR-2: Performance
**The system SHALL** generate signed URLs in less than 100ms  
**The system SHALL** support concurrent file uploads without blocking  
**The system SHALL** use database indexes on frequently queried fields (college_id, year, semester, subject)

#### NFR-3: Scalability
**The system SHALL** support storage of unlimited question papers in S3  
**The system SHALL** handle file uploads up to 50MB  
**The system SHALL** support pagination for large result sets

#### NFR-4: Reliability
**The system SHALL** continue operation even if S3 file deletion fails  
**The system SHALL** validate file integrity before upload  
**The system SHALL** provide meaningful error messages for failed operations

#### NFR-5: Maintainability
**The system SHALL** follow the same architectural patterns as the book feature  
**The system SHALL** use consistent naming conventions (QuestionPaper model, questionPaperController)  
**The system SHALL** include comprehensive error handling and logging

## Data Model Requirements

### Question Paper Entity
- **id**: UUID (primary key)
- **title**: String (required, max 500 characters)
- **description**: Text (optional)
- **subject**: String (required, max 100 characters)
- **year**: Integer (required, 1-4 for undergraduate years)
- **semester**: Integer (required, 1-8)
- **exam_type**: Enum (optional: 'midterm', 'final', 'quiz', 'practice')
- **marks**: Integer (optional, total marks for the exam)
- **pdf_url**: Text (S3 URL, optional)
- **college_id**: UUID (foreign key to colleges, nullable for global papers)
- **is_active**: Boolean (default true)
- **created_by**: UUID (foreign key to users)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Question Paper Access Log Entity
- **id**: UUID (primary key)
- **user_id**: UUID (foreign key to users)
- **question_paper_id**: UUID (foreign key to question_papers)
- **access_type**: String ('view' or 'download')
- **accessed_at**: Timestamp
- **ip_address**: INET
- **user_agent**: Text

## API Endpoints

### Question Paper Management
- `POST /api/question-papers` - Create question paper (admin only)
- `GET /api/question-papers` - List question papers (role-based filtering)
- `GET /api/question-papers/:id` - Get single question paper
- `PUT /api/question-papers/:id` - Update question paper (admin only)
- `DELETE /api/question-papers/:id` - Delete question paper (admin only)

### File Operations
- `POST /api/question-papers/:id/upload-pdf` - Upload PDF file (admin only)
- `GET /api/question-papers/:id/refresh-url` - Refresh signed URL

### Access Logging
- `POST /api/question-papers/:id/access` - Log access event

## Acceptance Criteria

### AC-1: Super Admin Access
**GIVEN** a super admin is authenticated  
**WHEN** they request question papers  
**THEN** they receive all question papers from all colleges  
**AND** they can create question papers for any college or globally

### AC-2: College Admin Access
**GIVEN** a college admin is authenticated  
**WHEN** they request question papers  
**THEN** they receive only question papers for their college  
**AND** they can only create/update/delete question papers for their college

### AC-3: Student Access
**GIVEN** a student is authenticated with college "ABC" and year "2"  
**WHEN** they request question papers  
**THEN** they receive only question papers for college "ABC" and year "2"  
**AND** they cannot create, update, or delete question papers

### AC-4: Individual User Access
**GIVEN** an individual user (role='user') is authenticated  
**WHEN** they request question papers  
**THEN** they receive all question papers from all colleges  
**AND** they cannot create, update, or delete question papers

### AC-5: File Upload
**GIVEN** an admin uploads a 30MB PDF file  
**WHEN** the upload completes successfully  
**THEN** the file is stored in S3 at `question-papers/pdfs/{question_paper_id}/{filename}`  
**AND** the question paper record is updated with the S3 URL  
**AND** a signed URL is returned to the client

### AC-6: Signed URL Expiration
**GIVEN** a user has a signed URL that is 2 hours old  
**WHEN** they attempt to access the PDF  
**THEN** the URL is expired  
**AND** they can request a new signed URL via the refresh endpoint

### AC-7: Access Logging
**GIVEN** a student views a question paper  
**WHEN** the view event is logged  
**THEN** the system records user_id, question_paper_id, access_type='view', timestamp, IP, and user agent

## Out of Scope
- Question paper versioning (future enhancement)
- Question paper sharing between colleges (future enhancement)
- Question paper analytics dashboard (future enhancement)
- Bulk import of question papers (future enhancement)
- Question paper categories/tags (future enhancement)

## Dependencies
- AWS S3 bucket configured with appropriate permissions
- Existing authentication and authorization middleware
- Existing file upload middleware (Multer)
- PostgreSQL database with Sequelize ORM
- Existing user and college models

## Risks and Mitigations
- **Risk**: S3 upload failures during high traffic  
  **Mitigation**: Implement retry logic and queue-based uploads for large files

- **Risk**: Unauthorized access to question papers  
  **Mitigation**: Strict role-based access control and signed URLs with short expiration

- **Risk**: Large file uploads blocking server  
  **Mitigation**: Use streaming uploads and set appropriate file size limits

## Success Metrics
- Question papers can be uploaded and accessed by appropriate users
- Role-based access control prevents unauthorized access
- Signed URLs expire correctly and can be refreshed
- All CRUD operations work as expected with proper permissions
- Access logging captures all view and download events
