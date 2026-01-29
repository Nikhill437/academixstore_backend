# Question Paper API - All Routes & Examples

## 🔗 Base URL
```
http://localhost:3000/api/question-papers
```

## 🔑 Authentication
All routes require JWT token in header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 Complete Routes List

| # | Method | Endpoint | Auth | Body Required | Description |
|---|--------|----------|------|---------------|-------------|
| 1 | POST | `/` | Admin | ✅ | Create question paper |
| 2 | GET | `/` | All | ❌ | List with filters (query params) |
| 3 | GET | `/:id` | All | ❌ | Get single question paper |
| 4 | PUT | `/:id` | Admin | ✅ | Update question paper |
| 5 | DELETE | `/:id` | Admin | ❌ | Delete (soft) |
| 6 | POST | `/:id/upload-pdf` | Admin | ✅ (file) | Upload PDF file |
| 7 | GET | `/:id/refresh-url` | All | ❌ | Refresh signed URL |
| 8 | POST | `/:id/access` | All | ✅ | Log access event |
| 9 | GET | `/subject/:subject` | All | ❌ | Filter by subject |
| 10 | GET | `/year/:year` | Admin | ❌ | Filter by year |
| 11 | GET | `/semester/:semester` | Admin | ❌ | Filter by semester |
| 12 | GET | `/exam-type/:type` | All | ❌ | Filter by exam type |

---

## 1️⃣ CREATE Question Paper

```http
POST /api/question-papers
Content-Type: application/json
Authorization: Bearer <token>
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
| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| title | string | ✅ | 1-500 chars | Question paper title |
| subject | string | ✅ | 1-100 chars | Subject name |
| year | integer | ✅ | 1-4 | Academic year |
| semester | integer | ✅ | 1-8 | Semester number |
| description | text | ❌ | Any length | Optional description |
| exam_type | enum | ❌ | midterm/final/quiz/practice | Type of exam |
| marks | integer | ❌ | >= 0 | Total marks |
| college_id | uuid | ❌ | Valid UUID | Super admin only |

### Response (201 Created)
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

---

## 2️⃣ GET Question Papers (List)

```http
GET /api/question-papers?subject=Data Structures&year=2&semester=3&exam_type=midterm
Authorization: Bearer <token>
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject | string | ❌ | Filter by subject name |
| year | integer | ❌ | Filter by year (1-4) |
| semester | integer | ❌ | Filter by semester (1-8) |
| exam_type | string | ❌ | Filter by type (midterm/final/quiz/practice) |

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

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Data%20Structures&year=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3️⃣ GET Single Question Paper

```http
GET /api/question-papers/:questionPaperId
Authorization: Bearer <token>
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

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4️⃣ UPDATE Question Paper

```http
PUT /api/question-papers/:questionPaperId
Content-Type: application/json
Authorization: Bearer <token>
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

### cURL Example
```bash
curl -X PUT http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Exam Title", "marks": 120}'
```

---

## 5️⃣ DELETE Question Paper

```http
DELETE /api/question-papers/:questionPaperId
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note:** Soft delete (sets `is_active = false`)

---

## 6️⃣ UPLOAD PDF File

```http
POST /api/question-papers/:questionPaperId/upload-pdf
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

### Form Data
| Field | Type | Required | Max Size | Notes |
|-------|------|----------|----------|-------|
| question_paper | file | ✅ | 50MB | PDF only |

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

### cURL Example
```bash
curl -X POST http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/upload-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "question_paper=@/path/to/exam-paper.pdf"
```

### JavaScript Example
```javascript
const formData = new FormData();
formData.append('question_paper', pdfFile);

const response = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);
```

---

## 7️⃣ REFRESH PDF URL

```http
GET /api/question-papers/:questionPaperId/refresh-url
Authorization: Bearer <token>
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

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/refresh-url \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8️⃣ LOG Access Event

```http
POST /api/question-papers/:questionPaperId/access
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "access_type": "view"
}
```

| Field | Type | Required | Values | Default |
|-------|------|----------|--------|---------|
| access_type | string | ❌ | view, download | view |

### Response (200 OK)
```json
{
  "success": true,
  "message": "Question paper access logged successfully"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/api/question-papers/550e8400-e29b-41d4-a716-446655440000/access \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"access_type": "download"}'
```

---

## 9️⃣ Filter by Subject

```http
GET /api/question-papers/subject/:subject
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/question-papers/subject/Data%20Structures" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔟 Filter by Year

```http
GET /api/question-papers/year/:year
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/year/2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 1️⃣1️⃣ Filter by Semester

```http
GET /api/question-papers/semester/:semester
Authorization: Bearer <token>
```

### cURL Example
```bash
curl -X GET http://localhost:3000/api/question-papers/semester/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 1️⃣2️⃣ Filter by Exam Type

```http
GET /api/question-papers/exam-type/:examType
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

---

## 🎯 Complete Workflow Example

### JavaScript Complete Flow
```javascript
// 1. Login
const loginRes = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@college.edu',
    password: 'password123'
  })
});
const { data: { token } } = await loginRes.json();

// 2. Create Question Paper
const createRes = await fetch('http://localhost:3000/api/question-papers', {
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
const { data: { question_paper } } = await createRes.json();
const questionPaperId = question_paper.id;

// 3. Upload PDF
const formData = new FormData();
formData.append('question_paper', pdfFile);

const uploadRes = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);
const uploadData = await uploadRes.json();
console.log('PDF URL:', uploadData.data.signed_url);

// 4. Get Question Papers
const listRes = await fetch(
  'http://localhost:3000/api/question-papers?subject=Operating Systems&year=3',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const papers = await listRes.json();
console.log('Papers:', papers.data.question_papers);

// 5. Update Question Paper
const updateRes = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Updated Exam Title',
      marks: 120
    })
  }
);

// 6. Log Access
const logRes = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/access`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ access_type: 'view' })
  }
);

// 7. Refresh URL (when expired)
const refreshRes = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/refresh-url`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const newUrl = await refreshRes.json();
console.log('New URL:', newUrl.data.pdf_access_url);

// 8. Delete Question Paper
const deleteRes = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}`,
  {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

---

## 🔐 Role-Based Access

| Role | Create | View All | View Own College | View Own Year | Update | Delete | Upload |
|------|--------|----------|------------------|---------------|--------|--------|--------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **college_admin** | ✅ | ❌ | ✅ (all years) | ✅ | ✅* | ✅* | ✅* |
| **student** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **user** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*College admins can only modify their own college's papers

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

## 📝 Important Notes

1. **2-Step Upload Process**
   - First create question paper → Get ID
   - Then upload PDF using that ID

2. **URL Expiration**
   - All PDF URLs expire after 1 hour
   - Use `/refresh-url` to get new URL

3. **File Validation**
   - Only PDF files accepted
   - Maximum 50MB file size

4. **Soft Delete**
   - DELETE doesn't remove from database
   - Sets `is_active = false`

5. **Role Filtering**
   - Students: Own college + own year only
   - College admins: Own college (all years)
   - Super admins & users: All papers

---

**Last Updated:** January 29, 2026  
**Version:** 1.0.0
