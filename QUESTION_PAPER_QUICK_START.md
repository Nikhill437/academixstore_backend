# Question Paper API - Quick Start Guide 🚀

## 📍 Base URL
```
http://localhost:3000/api/question-papers
```

## 🔑 Authentication
All routes require JWT token:
```
Authorization: Bearer <your-token>
```

---

## 📝 All Routes at a Glance

| # | Method | Endpoint | Auth | Purpose |
|---|--------|----------|------|---------|
| 1 | POST | `/` | Admin | Create question paper |
| 2 | GET | `/` | All | List with filters |
| 3 | GET | `/:id` | All | Get single |
| 4 | PUT | `/:id` | Admin | Update |
| 5 | DELETE | `/:id` | Admin | Delete (soft) |
| 6 | POST | `/:id/upload-pdf` | Admin | Upload PDF |
| 7 | GET | `/:id/refresh-url` | All | Refresh URL |
| 8 | POST | `/:id/access` | All | Log access |
| 9 | GET | `/subject/:subject` | All | Filter by subject |
| 10 | GET | `/year/:year` | Admin | Filter by year |
| 11 | GET | `/semester/:semester` | Admin | Filter by semester |
| 12 | GET | `/exam-type/:type` | All | Filter by type |

---

## 1. CREATE Question Paper

```http
POST /api/question-papers
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**
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

**Required:** title, subject, year, semester  
**Optional:** description, exam_type, marks, college_id

---

## 2. GET Question Papers (List)

```http
GET /api/question-papers?subject=Data Structures&year=2&semester=3
Authorization: Bearer <token>
```

**Query Params:** subject, year, semester, exam_type (all optional)

---

## 3. GET Single Question Paper

```http
GET /api/question-papers/:questionPaperId
Authorization: Bearer <token>
```

---

## 4. UPDATE Question Paper

```http
PUT /api/question-papers/:questionPaperId
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:** (all optional)
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "marks": 120
}
```

---

## 5. DELETE Question Paper

```http
DELETE /api/question-papers/:questionPaperId
Authorization: Bearer <token>
```

---

## 6. UPLOAD PDF

```http
POST /api/question-papers/:questionPaperId/upload-pdf
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- Field: `question_paper`
- Type: PDF file
- Max Size: 50MB

---

## 7. REFRESH URL

```http
GET /api/question-papers/:questionPaperId/refresh-url
Authorization: Bearer <token>
```

---

## 8. LOG Access

```http
POST /api/question-papers/:questionPaperId/access
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**
```json
{
  "access_type": "view"
}
```

**Values:** "view" or "download"

---

## 9-12. Filter Routes

```http
GET /api/question-papers/subject/:subject
GET /api/question-papers/year/:year
GET /api/question-papers/semester/:semester
GET /api/question-papers/exam-type/:examType
Authorization: Bearer <token>
```

**Exam Types:** midterm, final, quiz, practice

---

## 🎯 Complete Workflow

### Step 1: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@college.edu","password":"pass123"}'
```

### Step 2: Create Question Paper
```bash
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Final Exam - OS",
    "subject":"Operating Systems",
    "year":3,
    "semester":5,
    "exam_type":"final",
    "marks":100
  }'
```

### Step 3: Upload PDF
```bash
curl -X POST http://localhost:3000/api/question-papers/QUESTION_PAPER_ID/upload-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "question_paper=@/path/to/exam.pdf"
```

### Step 4: Get Question Papers
```bash
curl -X GET "http://localhost:3000/api/question-papers?subject=Operating%20Systems" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📱 JavaScript Example

```javascript
// 1. Create Question Paper
const createResponse = await fetch('http://localhost:3000/api/question-papers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Final Exam - OS',
    subject: 'Operating Systems',
    year: 3,
    semester: 5,
    exam_type: 'final',
    marks: 100
  })
});
const { data } = await createResponse.json();
const questionPaperId = data.question_paper.id;

// 2. Upload PDF
const formData = new FormData();
formData.append('question_paper', pdfFile);

const uploadResponse = await fetch(
  `http://localhost:3000/api/question-papers/${questionPaperId}/upload-pdf`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);

// 3. Get Question Papers
const listResponse = await fetch(
  'http://localhost:3000/api/question-papers?subject=Operating Systems',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const papers = await listResponse.json();
```

---

## 🔐 Role Access

| Role | Create | View All | View Own College | View Own Year | Update | Delete | Upload |
|------|--------|----------|------------------|---------------|--------|--------|--------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| college_admin | ✅ | ❌ | ✅ | ✅ | ✅* | ✅* | ✅* |
| student | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| user | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*Own college only

---

## ⚠️ Important Notes

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

## 📚 More Documentation

- **Complete Guide:** `QUESTION_PAPER_API_COMPLETE_GUIDE.md`
- **Routes Reference:** `QUESTION_PAPER_ROUTES_REFERENCE.md`
- **API Docs:** `API_DOCUMENTATION.md`

---

**Ready to use!** 🎉
