# Question Paper Management API - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Role-Based Access](#role-based-access)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)

---

## Overview

The Question Paper Management API allows educational institutions to manage exam question papers with role-based access control. Question papers are stored as PDFs in AWS S3 with secure signed URL access.

**Base URL:** `http://localhost:3000/api/question-papers`

**Key Features:**
- ✅ Role-based access control (super_admin, college_admin, student, user)
- ✅ PDF file upload to AWS S3 (max 50MB)
- ✅ Secure signed URLs with 1-hour expiration
- ✅ Filtering by subject, year, semester, exam type
- ✅ Access logging for analytics
- ✅ Soft delete functionality

---

## Authentication

All endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

Get your token by logging in:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@college.edu",
    "password": "your-password"
  }'
```

---

## API Endpoints

### 1. Create Question Paper

**Endpoint:** `POST /api/question-papers`  
**Auth:** Required (super_admin, college_admin)

**Request Body:**
```json
{
  "title": "Midterm Exam - Data Structures",
  "description": "Covers arrays, linked lists, stacks, queues",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100,
  "college_id": "uuid-here"
}
```

**Field Requirements:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| title | String | ✅ | 1-500 characters |
| subject | String | ✅ | 1-100 characters |
| year | Integer | ✅ | 1-4 |
| semester | Integer | ✅ | 1-8 |
| description | Text | ❌ | Any length |
| exam_type | Enum | ❌ | midterm, final, quiz, practice |
| marks | Integer | ❌ | >= 0 |
| college_id | UUID | ❌ | Valid college UUID |

**Notes:**
- **Super admin**: Can specify any `college_id` or leave null for global papers
- **College admin**: `college_id` is automatically set to their college

**Success Response (201):**
```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "question_paper": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Midterm Exam - Data Structures",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "college_id": "660e8400-e29b-41d4-a716-446655440000",
      "is_active": true,
      "created_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

---

### 2. Get Question Papers (List with Filters)

**Endpoint:** `GET /api/question-papers`  
**Auth:** Required (all roles)

**Query Parameters:**
```
?subject=Data Structures
&year=2
&semester=3
&exam_type=midterm
```

**Role-Based Filtering:**
- **super_admin**: All question papers
- **college_admin**: Only their college's papers (all years)
- **student**: Only their college + their year
- **user**: All question papers

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "question_papers": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Midterm Exam - Data Structures",
        "subject": "Data Structures",
        "year": 2,
        "semester": 3,
        "exam_type": "midterm",
        "marks": 100,
        "pdf_access_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600",
        "college": {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "name": "Delhi Technical University",
          "code": "DTU001"
        },
        "creator": {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "full_name": "Admin User",
          "email": "admin@dtu.ac.in"
        },
        "created_at": "2026-01-29T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### 3. Get Single Question Paper

**Endpoint:** `GET /api/question-papers/:questionPaperId`  
**Auth:** Required (must have access)

**Example:**
```bash
GET /api/question-papers/550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "question_paper": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Midterm Exam - Data Structures",
      "description": "Covers arrays, linked lists, stacks, queues",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "pdf_access_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600",
      "college": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Delhi Technical University",
        "code": "DTU001"
      },
      "creator": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "full_name": "Admin User",
        "email": "admin@dtu.ac.in"
      },
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

---

### 4. Update Question Paper

**Endpoint:** `PUT /api/question-papers/:questionPaperId`  
**Auth:** Required (super_admin, college_admin - own college only)

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "marks": 120
}
```

**Allowed Fields:**
- title, description, subject, year, semester, exam_type, marks

**Cannot Update:**
- id, pdf_url, college_id, created_by, timestamps

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question paper updated successfully",
  "data": {
    "question_paper": { /* updated object */ }
  }
}
```

---

### 5. Delete Question Paper

**Endpoint:** `DELETE /api/question-papers/:questionPaperId`  
**Auth:** Required (super_admin, college_admin - own college only)

**Behavior:**
- Performs **soft delete** (sets `is_active = false`)
- Attempts to delete PDF from S3
- Question paper remains in database

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

---

### 6. Upload Question Paper PDF

**Endpoint:** `POST /api/question-papers/:questionPaperId/upload-pdf`  
**Auth:** Required (super_admin, college_admin - own college only)  
**Content-Type:** `multipart/form-data`

**Form Data:**
- Field name: `question_paper`
- File type: PDF only
- Max size: 50MB

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/upload-pdf \
  -H "Authorization: Bearer your-jwt-token" \
  -F "question_paper=@/path/to/exam-paper.pdf"
```

**Example using JavaScript (FormData):**
```javascript
const formData = new FormData();
formData.append('question_paper', pdfFile);

fetch(`http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "550e8400-e29b-41d4-a716-446655440000",
    "pdf_url": "https://bucket.s3.amazonaws.com/question-papers/pdfs/550e8400.../file.pdf",
    "signed_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600",
    "original_name": "midterm-exam.pdf"
  }
}
```

---

### 7. Refresh PDF Access URL

**Endpoint:** `GET /api/question-papers/:questionPaperId/refresh-url`  
**Auth:** Required (must have access)

**Purpose:** Generate new signed URL when previous expires (after 1 hour)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "question_paper_id": "550e8400-e29b-41d4-a716-446655440000",
    "pdf_access_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600",
    "expires_in": 3600
  }
}
```

---

### 8. Log Question Paper Access

**Endpoint:** `POST /api/question-papers/:questionPaperId/access`  
**Auth:** Required (must have access)

**Request Body:**
```json
{
  "access_type": "view"
}
```

**Access Types:**
- `view`: User viewed the question paper
- `download`: User downloaded the PDF

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question paper access logged successfully"
}
```

**Logged Data:**
- user_id, question_paper_id, access_type
- timestamp, IP address, user agent

---

### 9. Filter by Subject

**Endpoint:** `GET /api/question-papers/subject/:subject`  
**Auth:** Required

**Example:**
```bash
GET /api/question-papers/subject/Data%20Structures
```

---

### 10. Filter by Year

**Endpoint:** `GET /api/question-papers/year/:year`  
**Auth:** Required (super_admin, college_admin)

**Example:**
```bash
GET /api/question-papers/year/2
```

---

### 11. Filter by Semester

**Endpoint:** `GET /api/question-papers/semester/:semester`  
**Auth:** Required (super_admin, college_admin)

**Example:**
```bash
GET /api/question-papers/semester/3
```

---

### 12. Filter by Exam Type

**Endpoint:** `GET /api/question-papers/exam-type/:examType`  
**Auth:** Required

**Valid Exam Types:**
- midterm
- final
- quiz
- practice

**Example:**
```bash
GET /api/question-papers/exam-type/midterm
```

---

## Request/Response Examples

### Complete Upload Workflow

#### Step 1: Create Question Paper
```bash
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Exam - Operating Systems",
    "subject": "Operating Systems",
    "year": 3,
    "semester": 5,
    "exam_type": "final",
    "marks": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question_paper": {
      "id": "abc123-def456-ghi789",
      "title": "Final Exam - Operating Systems",
      ...
    }
  }
}
```

#### Step 2: Upload PDF
```bash
curl -X POST http://localhost:3000/api/question-papers/abc123-def456-ghi789/upload-pdf \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "question_paper=@/Users/admin/Desktop/os-final-exam.pdf"
```

**Response:**
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "abc123-def456-ghi789",
    "pdf_url": "https://bucket.s3.amazonaws.com/question-papers/pdfs/abc123.../file.pdf",
    "signed_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600"
  }
}
```

#### Step 3: Get Question Papers
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Operating%20Systems&year=3" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Role-Based Access

### Access Matrix

| Role | Create | View All | View Own College | View Own Year | Update | Delete | Upload PDF |
|------|--------|----------|------------------|---------------|--------|--------|------------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **college_admin** | ✅ | ❌ | ✅ (all years) | ✅ | ✅* | ✅* | ✅* |
| **student** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **user** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*College admins can only modify their own college's question papers

### Access Examples

#### Super Admin
```javascript
// Can create for any college
POST /api/question-papers
{
  "title": "Exam",
  "subject": "Math",
  "year": 2,
  "semester": 3,
  "college_id": "any-college-uuid"  // Optional
}

// Sees all question papers
GET /api/question-papers
// Returns: All papers from all colleges
```

#### College Admin (College: DTU)
```javascript
// Can only create for their college
POST /api/question-papers
{
  "title": "Exam",
  "subject": "Math",
  "year": 2,
  "semester": 3
  // college_id automatically set to DTU
}

// Sees only their college's papers
GET /api/question-papers
// Returns: Only DTU papers (all years)
```

#### Student (College: DTU, Year: 2)
```javascript
// Cannot create

// Sees only their college + year
GET /api/question-papers
// Returns: Only DTU papers for year 2
```

#### User (Individual)
```javascript
// Cannot create

// Sees all papers
GET /api/question-papers
// Returns: All papers from all colleges
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Title, subject, year, and semester are required",
  "error": "MISSING_REQUIRED_FIELDS"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "AUTH_REQUIRED"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied to this question paper",
  "error": "ACCESS_DENIED"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Question paper not found",
  "error": "QUESTION_PAPER_NOT_FOUND"
}
```

#### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to upload question paper PDF",
  "error": "UPLOAD_ERROR",
  "details": "S3 connection timeout"
}
```

### Error Codes Reference

| Code | Description |
|------|-------------|
| `QUESTION_PAPER_NOT_FOUND` | Question paper doesn't exist |
| `ACCESS_DENIED` | User lacks permission |
| `INSUFFICIENT_PERMISSIONS` | Role not authorized |
| `NO_FILE` | No PDF file provided |
| `INVALID_FILE_TYPE` | File is not a PDF |
| `FILE_TOO_LARGE` | File exceeds 50MB |
| `NO_PDF` | Question paper has no PDF |
| `UPLOAD_ERROR` | S3 upload failed |
| `NO_COLLEGE_ASSOCIATION` | User must have college |
| `COLLEGE_NOT_FOUND` | College doesn't exist |
| `INVALID_COLLEGE` | Invalid/inactive college |
| `URL_GENERATION_FAILED` | Signed URL generation failed |

---

## Testing Guide

### Using Postman

#### 1. Setup Environment Variables
```
BASE_URL = http://localhost:3000
TOKEN = your-jwt-token-here
```

#### 2. Create Question Paper
```
POST {{BASE_URL}}/api/question-papers
Headers:
  Authorization: Bearer {{TOKEN}}
  Content-Type: application/json
Body (raw JSON):
{
  "title": "Test Exam",
  "subject": "Computer Science",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100
}
```

#### 3. Upload PDF
```
POST {{BASE_URL}}/api/question-papers/{{QUESTION_PAPER_ID}}/upload-pdf
Headers:
  Authorization: Bearer {{TOKEN}}
Body (form-data):
  question_paper: [Select PDF file]
```

#### 4. Get Question Papers
```
GET {{BASE_URL}}/api/question-papers?subject=Computer Science
Headers:
  Authorization: Bearer {{TOKEN}}
```

### Using cURL

#### Create Question Paper
```bash
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Exam",
    "subject": "Computer Science",
    "year": 2,
    "semester": 3
  }'
```

#### Upload PDF
```bash
curl -X POST http://localhost:3000/api/question-papers/QUESTION_PAPER_ID/upload-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "question_paper=@/path/to/file.pdf"
```

#### Get Question Papers
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Computer%20Science" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using JavaScript/Fetch

```javascript
// Create Question Paper
async function createQuestionPaper() {
  const response = await fetch('http://localhost:3000/api/question-papers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Test Exam',
      subject: 'Computer Science',
      year: 2,
      semester: 3,
      exam_type: 'midterm',
      marks: 100
    })
  });
  
  const data = await response.json();
  console.log(data);
}

// Upload PDF
async function uploadPDF(questionPaperId, file) {
  const formData = new FormData();
  formData.append('question_paper', file);
  
  const response = await fetch(
    `http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  const data = await response.json();
  console.log(data);
}

// Get Question Papers
async function getQuestionPapers(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(
    `http://localhost:3000/api/question-papers?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  console.log(data);
}

// Usage
createQuestionPaper();
uploadPDF('question-paper-id', pdfFile);
getQuestionPapers({ subject: 'Computer Science', year: 2 });
```

---

## Best Practices

### 1. Always Create Before Upload
```javascript
// ✅ Correct
const qp = await createQuestionPaper(metadata);
await uploadPDF(qp.id, file);

// ❌ Wrong
await uploadPDF('non-existent-id', file);  // Will fail
```

### 2. Handle Expired URLs
```javascript
// Check if URL is expired and refresh
async function getPDFUrl(questionPaperId) {
  try {
    const response = await fetch(`/api/question-papers/${questionPaperId}`);
    const data = await response.json();
    return data.data.question_paper.pdf_access_url;
  } catch (error) {
    // If expired, refresh
    const refreshResponse = await fetch(
      `/api/question-papers/${questionPaperId}/refresh-url`
    );
    const refreshData = await refreshResponse.json();
    return refreshData.data.pdf_access_url;
  }
}
```

### 3. Validate Files Before Upload
```javascript
function validatePDF(file) {
  // Check file type
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  
  // Check file size (50MB = 52428800 bytes)
  if (file.size > 52428800) {
    throw new Error('File size must be less than 50MB');
  }
  
  return true;
}
```

### 4. Log Access for Analytics
```javascript
async function viewQuestionPaper(questionPaperId) {
  // Get question paper
  const qp = await getQuestionPaper(questionPaperId);
  
  // Log the access
  await fetch(`/api/question-papers/${questionPaperId}/access`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ access_type: 'view' })
  });
  
  // Display question paper
  displayQuestionPaper(qp);
}
```

---

## Configuration

### Environment Variables Required

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development
```

### AWS S3 Permissions

Your AWS IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

---

## Support

For issues or questions:
- Check error codes in the Error Handling section
- Review role-based access matrix
- Verify AWS S3 configuration
- Check JWT token validity

---

**Last Updated:** January 29, 2026  
**API Version:** 1.0.0
