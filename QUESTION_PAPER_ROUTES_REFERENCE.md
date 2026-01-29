# Question Paper API Routes - Quick Reference

## 🚀 Quick Start

**Base URL:** `http://localhost:3000/api/question-papers`

**Authentication:** All routes require JWT token
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 All Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Admin | Create question paper |
| GET | `/` | All | List question papers (filtered by role) |
| GET | `/:id` | All | Get single question paper |
| PUT | `/:id` | Admin | Update question paper |
| DELETE | `/:id` | Admin | Delete question paper (soft) |
| POST | `/:id/upload-pdf` | Admin | Upload PDF file |
| GET | `/:id/refresh-url` | All | Refresh signed URL |
| POST | `/:id/access` | All | Log access event |
| GET | `/subject/:subject` | All | Filter by subject |
| GET | `/year/:year` | Admin | Filter by year |
| GET | `/semester/:semester` | Admin | Filter by semester |
| GET | `/exam-type/:examType` | All | Filter by exam type |

---

## 1️⃣ CREATE Question Paper

```http
POST /api/question-papers
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "title": "Midterm Exam - Data Structures",
  "description": "Covers arrays, linked lists, stacks, and queues",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100,
  "college_id": "uuid-here"
}
```

### Field Details
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | ✅ | Max 500 chars |
| subject | string | ✅ | Max 100 chars |
| year | integer | ✅ | 1-4 |
| semester | integer | ✅ | 1-8 |
| description | text | ❌ | Optional |
| exam_type | enum | ❌ | midterm, final, quiz, practice |
| marks | integer | ❌ | >= 0 |
| college_id | uuid | ❌ | Super admin only |

### cURL Example
```bash
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer YOUR_TOKEN" \
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

### JavaScript Example
```javascript
const response = await fetch('http://localhost:3000/api/question-papers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Final Exam - Operating Systems',
    subject: 'Operating Systems',
    year: 3,
    semester: 5,
    exam_type: 'final',
    marks: 100
  })
});

const data = await response.json();
console.log(data.data.question_paper.id); // Save this ID for upload
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "question_paper": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Final Exam - Operating Systems",
      "subject": "Operating Systems",
      "year": 3,
      "semester": 5,
      "exam_type": "final",
      "marks": 100,
      "college_id": "660e8400-e29b-41d4-a716-446655440000",
      "is_active": true,
      "created_by": "770e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

---

## 2️⃣ GET Question Papers (List)

```http
GET /api/question-papers
```

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
```
?subject=Data Structures
&year=2
&semester=3
&exam_type=midterm
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject | string | ❌ | Filter by subject |
| year | integer | ❌ | Filter by year (1-4) |
| semester | integer | ❌ | Filter by semester (1-8) |
| exam_type | string | ❌ | midterm, final, quiz, practice |

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Data%20Structures&year=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const params = new URLSearchParams({
  subject: 'Data Structures',
  year: 2,
  semester: 3
});

const response = await fetch(`http://localhost:3000/api/question-papers?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.data.question_papers);
```

### Response (200 OK)
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

## 3️⃣ GET Single Question Paper

```http
GET /api/question-papers/:questionPaperId
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`http://localhost:3000/api/question-papers/${questionPaperId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.data.question_paper);
```

### Response (200 OK)
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
      "college": { /* college object */ },
      "creator": { /* creator object */ },
      "created_at": "2026-01-29T10:00:00Z",
      "updated_at": "2026-01-29T10:00:00Z"
    }
  }
}
```

---

## 4️⃣ UPDATE Question Paper

```http
PUT /api/question-papers/:questionPaperId
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body (All fields optional)
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

### Allowed Fields
- title, description, subject, year, semester, exam_type, marks

### Cannot Update
- id, pdf_url, college_id, created_by, timestamps

### cURL Example
```bash
curl -X PUT http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Exam Title",
    "marks": 120
  }'
```

### JavaScript Example
```javascript
const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`http://localhost:3000/api/question-papers/${questionPaperId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Updated Exam Title',
    marks: 120
  })
});

const data = await response.json();
```

### Response (200 OK)
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

## 5️⃣ DELETE Question Paper

```http
DELETE /api/question-papers/:questionPaperId
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`http://localhost:3000/api/question-papers/${questionPaperId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

**Note:** This is a soft delete (sets `is_active = false`)

---

## 6️⃣ UPLOAD PDF File

```http
POST /api/question-papers/:questionPaperId/upload-pdf
```

### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Form Data
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| question_paper | file | ✅ | PDF only, max 50MB |

### cURL Example
```bash
curl -X POST http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/upload-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "question_paper=@/path/to/exam-paper.pdf"
```

### JavaScript Example (with File Input)
```javascript
// HTML: <input type="file" id="pdfFile" accept="application/pdf">

const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';
const fileInput = document.getElementById('pdfFile');
const file = fileInput.files[0];

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
console.log(data.data.signed_url); // Use this URL to access PDF
```

### JavaScript Example (with File Object)
```javascript
async function uploadQuestionPaperPDF(questionPaperId, pdfFile) {
  // Validate file
  if (pdfFile.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  
  if (pdfFile.size > 52428800) { // 50MB
    throw new Error('File size must be less than 50MB');
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('question_paper', pdfFile);
  
  // Upload
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
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return await response.json();
}

// Usage
const result = await uploadQuestionPaperPDF(questionPaperId, pdfFile);
console.log('PDF uploaded:', result.data.signed_url);
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "550e8400-e29b-41d4-a716-446655440000",
    "pdf_url": "https://bucket.s3.amazonaws.com/question-papers/pdfs/550e8400.../file.pdf",
    "signed_url": "https://bucket.s3.amazonaws.com/...?X-Amz-Expires=3600",
    "original_name": "exam-paper.pdf"
  }
}
```

---

## 7️⃣ REFRESH PDF URL

```http
GET /api/question-papers/:questionPaperId/refresh-url
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/refresh-url \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/refresh-url`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
console.log(data.data.pdf_access_url); // New signed URL
```

### Response (200 OK)
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

## 8️⃣ LOG Access Event

```http
POST /api/question-papers/:questionPaperId/access
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "access_type": "view"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| access_type | string | ❌ | view, download (default: view) |

### cURL Example
```bash
curl -X POST http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/access \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"access_type": "download"}'
```

### JavaScript Example
```javascript
const questionPaperId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/access`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_type: 'download'
    })
  }
);

const data = await response.json();
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Question paper access logged successfully"
}
```

---

## 9️⃣ Filter by Subject

```http
GET /api/question-papers/subject/:subject
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/question-papers/subject/Data%20Structures" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const subject = 'Data Structures';
const encodedSubject = encodeURIComponent(subject);

const response = await fetch(
  `http://localhost:3000/api/question-papers/subject/${encodedSubject}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
```

---

## 🔟 Filter by Year

```http
GET /api/question-papers/year/:year
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/year/2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const year = 2;

const response = await fetch(
  `http://localhost:3000/api/question-papers/year/${year}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
```

---

## 1️⃣1️⃣ Filter by Semester

```http
GET /api/question-papers/semester/:semester
```

### Headers
```
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/semester/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const semester = 3;

const response = await fetch(
  `http://localhost:3000/api/question-papers/semester/${semester}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
```

---

## 1️⃣2️⃣ Filter by Exam Type

```http
GET /api/question-papers/exam-type/:examType
```

### Headers
```
Authorization: Bearer <token>
```

### Valid Exam Types
- `midterm`
- `final`
- `quiz`
- `practice`

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/exam-type/midterm \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript Example
```javascript
const examType = 'midterm';

const response = await fetch(
  `http://localhost:3000/api/question-papers/exam-type/${examType}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
```

---

## 🔐 Authentication

### Get JWT Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@college.edu",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@college.edu",
      "role": "college_admin"
    }
  }
}
```

Use the `token` value in all subsequent requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 Complete Workflow Example

### Step-by-Step: Create and Upload Question Paper

```javascript
// 1. Login to get token
async function login() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@college.edu',
      password: 'password123'
    })
  });
  const data = await response.json();
  return data.data.token;
}

// 2. Create question paper
async function createQuestionPaper(token) {
  const response = await fetch('http://localhost:3000/api/question-papers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Final Exam - Operating Systems',
      subject: 'Operating Systems',
      year: 3,
      semester: 5,
      exam_type: 'final',
      marks: 100
    })
  });
  const data = await response.json();
  return data.data.question_paper.id;
}

// 3. Upload PDF
async function uploadPDF(token, questionPaperId, file) {
  const formData = new FormData();
  formData.append('question_paper', file);
  
  const response = await fetch(
    `http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }
  );
  const data = await response.json();
  return data.data.signed_url;
}

// 4. Get question papers
async function getQuestionPapers(token, filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(
    `http://localhost:3000/api/question-papers?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}

// Execute workflow
async function main() {
  try {
    // Login
    const token = await login();
    console.log('✅ Logged in');
    
    // Create question paper
    const questionPaperId = await createQuestionPaper(token);
    console.log('✅ Question paper created:', questionPaperId);
    
    // Upload PDF (assuming you have a file)
    const pdfFile = document.getElementById('fileInput').files[0];
    const pdfUrl = await uploadPDF(token, questionPaperId, pdfFile);
    console.log('✅ PDF uploaded:', pdfUrl);
    
    // Get question papers
    const papers = await getQuestionPapers(token, { 
      subject: 'Operating Systems',
      year: 3 
    });
    console.log('✅ Retrieved papers:', papers.data.count);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Title, subject, year, and semester are required",
  "error": "MISSING_REQUIRED_FIELDS"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "AUTH_REQUIRED"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied to this question paper",
  "error": "ACCESS_DENIED"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Question paper not found",
  "error": "QUESTION_PAPER_NOT_FOUND"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to upload question paper PDF",
  "error": "UPLOAD_ERROR"
}
```

---

## 📝 Notes

1. **PDF Upload is 2-Step Process:**
   - First create question paper (get ID)
   - Then upload PDF using that ID

2. **Signed URLs Expire:**
   - All PDF URLs expire after 1 hour
   - Use refresh-url endpoint to get new URL

3. **Role-Based Access:**
   - Students see only their college + year
   - College admins see only their college (all years)
   - Super admins and users see all

4. **File Validation:**
   - Only PDF files accepted
   - Maximum size: 50MB
   - Validated on server side

5. **Soft Delete:**
   - DELETE doesn't remove from database
   - Sets `is_active = false`
   - Won't appear in GET requests

---

**Last Updated:** January 29, 2026
