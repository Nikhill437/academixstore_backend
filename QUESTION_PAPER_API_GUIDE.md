# Question Paper API - UI Integration Guide

## Overview
Question papers work like books - you can create them with or without PDFs. Upload is optional and only accessible to admins.

---

## 🎯 **Key Points**
- ✅ Question papers can be created **without PDF files**
- ✅ PDF upload is **optional** and **separate** from creation
- ✅ Only **Super Admin** and **College Admin** can upload PDFs
- ✅ **All roles** can view question papers (filtered by their permissions)
- ✅ Get API filters by **subject** automatically

---

## 📱 **Mobile/Web App APIs** (All Users)

### 1️⃣ **Get Question Papers by Subject**
**Endpoint:** `GET /api/question-papers?subject={subjectName}`  
**Auth:** Required (JWT Token)  
**Access:** All roles (students, users, admins)

#### Request Example:
```javascript
// Get all Data Structures question papers
fetch('https://your-api.com/api/question-papers?subject=Data Structures', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})

// Get with multiple filters
fetch('https://your-api.com/api/question-papers?subject=Data Structures&year=2&semester=3', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

#### Response Example:
```json
{
  "success": true,
  "data": {
    "question_papers": [
      {
        "id": "uuid-1",
        "title": "Midterm Exam - Data Structures",
        "description": "Covers arrays, linked lists, stacks, queues",
        "subject": "Data Structures",
        "year": 2,
        "semester": 3,
        "exam_type": "midterm",
        "marks": 100,
        "pdf_access_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
        "college": {
          "id": "college-uuid",
          "name": "ABC College",
          "code": "ABC"
        },
        "created_at": "2026-01-25T10:00:00Z"
      },
      {
        "id": "uuid-2",
        "title": "Final Exam - Data Structures",
        "description": "Comprehensive final exam",
        "subject": "Data Structures",
        "year": 2,
        "semester": 3,
        "exam_type": "final",
        "marks": 150,
        "pdf_access_url": null,
        "college": {
          "id": "college-uuid",
          "name": "ABC College",
          "code": "ABC"
        },
        "created_at": "2026-01-20T10:00:00Z"
      }
    ],
    "count": 2
  }
}
```

**Note:** `pdf_access_url` will be `null` if no PDF has been uploaded yet.

---

### 2️⃣ **Get Single Question Paper**
**Endpoint:** `GET /api/question-papers/:id`  
**Auth:** Required (JWT Token)  
**Access:** All roles (if they have permission)

#### Request Example:
```javascript
fetch('https://your-api.com/api/question-papers/uuid-here', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

#### Response Example:
```json
{
  "success": true,
  "data": {
    "question_paper": {
      "id": "uuid-here",
      "title": "Midterm Exam - Data Structures",
      "description": "Covers arrays, linked lists, stacks, queues",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "pdf_access_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
      "college": {
        "id": "college-uuid",
        "name": "ABC College",
        "code": "ABC"
      },
      "creator": {
        "id": "user-uuid",
        "full_name": "Admin User",
        "email": "admin@college.com"
      },
      "created_at": "2026-01-25T10:00:00Z",
      "updated_at": "2026-01-25T10:00:00Z"
    }
  }
}
```

---

### 3️⃣ **Refresh PDF URL** (When URL expires)
**Endpoint:** `GET /api/question-papers/:id/refresh-url`  
**Auth:** Required (JWT Token)  
**Access:** All roles (if they have permission)

#### Request Example:
```javascript
fetch('https://your-api.com/api/question-papers/uuid-here/refresh-url', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

#### Response Example:
```json
{
  "success": true,
  "data": {
    "question_paper_id": "uuid-here",
    "pdf_access_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "expires_in": 3600
  }
}
```

---

## 🔐 **Admin APIs** (Super Admin & College Admin Only)

### 4️⃣ **Create Question Paper** (Without PDF)
**Endpoint:** `POST /api/question-papers`  
**Auth:** Required (JWT Token)  
**Access:** Super Admin, College Admin only

#### Request Body:
```json
{
  "title": "Midterm Exam - Data Structures",
  "description": "Covers arrays, linked lists, stacks, queues",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100
}
```

**Note:** `college_id` is optional. If not provided:
- **Super Admin**: Creates a global question paper
- **College Admin**: Automatically uses their college

#### Request Example:
```javascript
fetch('https://your-api.com/api/question-papers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Midterm Exam - Data Structures",
    description: "Covers arrays, linked lists, stacks, queues",
    subject: "Data Structures",
    year: 2,
    semester: 3,
    exam_type: "midterm",
    marks: 100
  })
})
```

#### Response Example:
```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "question_paper": {
      "id": "uuid-here",
      "title": "Midterm Exam - Data Structures",
      "subject": "Data Structures",
      "year": 2,
      "semester": 3,
      "exam_type": "midterm",
      "marks": 100,
      "pdf_url": null,
      "created_at": "2026-01-25T10:00:00Z"
    }
  }
}
```

---

### 5️⃣ **Upload PDF** (Optional - Separate Step)
**Endpoint:** `POST /api/question-papers/:id/upload-pdf`  
**Auth:** Required (JWT Token)  
**Access:** Super Admin, College Admin only  
**Content-Type:** `multipart/form-data`

#### Request Example:
```javascript
const formData = new FormData();
formData.append('question_paper', pdfFile); // File from input

fetch('https://your-api.com/api/question-papers/uuid-here/upload-pdf', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: formData
})
```

#### Response Example:
```json
{
  "success": true,
  "message": "Question paper PDF uploaded successfully",
  "data": {
    "question_paper_id": "uuid-here",
    "pdf_url": "https://s3.amazonaws.com/bucket/question-papers/pdfs/uuid/file.pdf",
    "signed_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "original_name": "midterm-exam.pdf"
  }
}
```

---

### 6️⃣ **Update Question Paper**
**Endpoint:** `PUT /api/question-papers/:id`  
**Auth:** Required (JWT Token)  
**Access:** Super Admin, College Admin (own college only)

#### Request Body (all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "marks": 120
}
```

#### Request Example:
```javascript
fetch('https://your-api.com/api/question-papers/uuid-here', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Updated Title",
    marks: 120
  })
})
```

---

### 7️⃣ **Delete Question Paper**
**Endpoint:** `DELETE /api/question-papers/:id`  
**Auth:** Required (JWT Token)  
**Access:** Super Admin, College Admin (own college only)

#### Request Example:
```javascript
fetch('https://your-api.com/api/question-papers/uuid-here', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
})
```

#### Response Example:
```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

---

## 📊 **Query Parameters for Filtering**

You can combine multiple filters in the GET request:

```javascript
// Filter by subject only
GET /api/question-papers?subject=Data Structures

// Filter by subject and year
GET /api/question-papers?subject=Data Structures&year=2

// Filter by subject, year, and semester
GET /api/question-papers?subject=Data Structures&year=2&semester=3

// Filter by subject and exam type
GET /api/question-papers?subject=Data Structures&exam_type=midterm

// All filters combined
GET /api/question-papers?subject=Data Structures&year=2&semester=3&exam_type=midterm
```

---

## 🎭 **Role-Based Access**

### What Each Role Can See:

| Role          | Can View                                    | Can Create | Can Upload PDF | Can Update | Can Delete |
|---------------|---------------------------------------------|------------|----------------|------------|------------|
| **Super Admin**   | All question papers from all colleges       | ✅         | ✅             | ✅         | ✅         |
| **College Admin** | Only their college's question papers        | ✅         | ✅             | ✅*        | ✅*        |
| **Student**       | Only their college + year question papers   | ❌         | ❌             | ❌         | ❌         |
| **User**          | All question papers from all colleges       | ❌         | ❌             | ❌         | ❌         |

*College Admin can only modify their own college's question papers

---

## 💡 **UI Implementation Examples**

### Example 1: Display Question Papers by Subject (Mobile/Web)
```javascript
async function getQuestionPapers(subject) {
  try {
    const response = await fetch(
      `https://your-api.com/api/question-papers?subject=${encodeURIComponent(subject)}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      // Display question papers
      data.data.question_papers.forEach(qp => {
        console.log(`Title: ${qp.title}`);
        console.log(`Marks: ${qp.marks}`);
        console.log(`Has PDF: ${qp.pdf_access_url ? 'Yes' : 'No'}`);
        
        // Show download button only if PDF exists
        if (qp.pdf_access_url) {
          showDownloadButton(qp.pdf_access_url);
        }
      });
    }
  } catch (error) {
    console.error('Error fetching question papers:', error);
  }
}
```

### Example 2: Admin Upload Flow
```javascript
// Step 1: Create question paper (without PDF)
async function createQuestionPaper(data) {
  const response = await fetch('https://your-api.com/api/question-papers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  return result.data.question_paper.id; // Return the ID
}

// Step 2: Upload PDF (optional)
async function uploadPDF(questionPaperId, pdfFile) {
  const formData = new FormData();
  formData.append('question_paper', pdfFile);
  
  const response = await fetch(
    `https://your-api.com/api/question-papers/${questionPaperId}/upload-pdf`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    }
  );
  
  return await response.json();
}

// Usage
async function handleSubmit(formData, pdfFile) {
  // Create question paper first
  const questionPaperId = await createQuestionPaper(formData);
  
  // Upload PDF if provided
  if (pdfFile) {
    await uploadPDF(questionPaperId, pdfFile);
  }
  
  alert('Question paper created successfully!');
}
```

### Example 3: Handle Expired PDF URLs
```javascript
async function downloadPDF(questionPaperId, currentUrl) {
  try {
    // Try to download with current URL
    const response = await fetch(currentUrl);
    
    if (response.status === 403) {
      // URL expired, refresh it
      const refreshResponse = await fetch(
        `https://your-api.com/api/question-papers/${questionPaperId}/refresh-url`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const data = await refreshResponse.json();
      
      // Use new URL
      window.open(data.data.pdf_access_url, '_blank');
    } else {
      // URL still valid
      window.open(currentUrl, '_blank');
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
  }
}
```

---

## 🚨 **Error Handling**

### Common Errors:

#### No PDF Uploaded Yet:
```json
{
  "success": false,
  "message": "No PDF available for this question paper",
  "error": "NO_PDF"
}
```

#### Access Denied:
```json
{
  "success": false,
  "message": "Access denied to this question paper",
  "error": "ACCESS_DENIED"
}
```

#### File Too Large:
```json
{
  "success": false,
  "message": "File too large. Maximum size is 50MB.",
  "error": "FILE_TOO_LARGE"
}
```

#### Invalid File Type:
```json
{
  "success": false,
  "message": "Invalid file type. Only PDF files are allowed.",
  "error": "INVALID_FILE_TYPE"
}
```

---

## ✅ **Summary**

### For Mobile/Web App (All Users):
1. Use `GET /api/question-papers?subject=SubjectName` to get question papers
2. Check if `pdf_access_url` exists before showing download button
3. Use refresh endpoint if PDF URL expires (after 1 hour)

### For Admin Panel:
1. Create question paper with `POST /api/question-papers` (PDF optional)
2. Optionally upload PDF with `POST /api/question-papers/:id/upload-pdf`
3. Update/delete as needed

### Key Features:
- ✅ PDF upload is **optional**
- ✅ Question papers can exist **without PDFs**
- ✅ All roles can **view** (filtered by permissions)
- ✅ Only admins can **upload/modify**
- ✅ Automatic filtering by **subject, year, semester**
- ✅ Signed URLs expire after **1 hour** (refresh available)

---

This matches exactly how the books API works! 🎉
