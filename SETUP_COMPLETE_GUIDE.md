# Question Paper Feature - Complete Setup Guide

## 🎯 Quick Summary

You have **2 options** for implementing question papers:

### ✅ Option 1: Separate Table (RECOMMENDED - Already Implemented)
- Dedicated `question_papers` table
- Clean data separation
- Better performance
- **Status:** Fully implemented and ready to use

### ⚠️ Option 2: Add Column to Books Table
- Add `question_paper` boolean column to `books` table
- Reuse existing books infrastructure
- **Status:** Migration file provided

---

## 📁 Files You Need

### 1. **All Routes Reference**
**File:** `QUESTION_PAPER_ALL_ROUTES.md`
- Complete list of all 12 API routes
- Request body examples for each route
- cURL and JavaScript examples
- Response formats
- **This is your main reference file!**

### 2. **Database Changes**
**File:** `DATABASE_CHANGES_GUIDE.md`
- Complete database schema
- Migration instructions
- Comparison of both options
- Troubleshooting guide

### 3. **Migration Files**
- `database/migrations/create_question_papers_tables.sql` (Option 1)
- `database/migrations/add_question_paper_to_books.sql` (Option 2)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration

**For Option 1 (Recommended - Separate Table):**
```bash
psql -U your_username -d your_database -f database/migrations/create_question_papers_tables.sql
```

**For Option 2 (Books Table Column):**
```bash
psql -U your_username -d your_database -f database/migrations/add_question_paper_to_books.sql
```

### Step 2: Verify Tables Created

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('question_papers', 'question_paper_access_logs');

-- Check columns
\d question_papers
```

### Step 3: Test API

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@college.edu","password":"password123"}'

# 2. Create Question Paper
curl -X POST http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Exam",
    "subject":"Computer Science",
    "year":2,
    "semester":3,
    "exam_type":"midterm",
    "marks":100
  }'

# 3. Get Question Papers
curl -X GET http://localhost:3000/api/question-papers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 All 12 API Routes

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/api/question-papers` | Create question paper |
| 2 | GET | `/api/question-papers` | List with filters |
| 3 | GET | `/api/question-papers/:id` | Get single |
| 4 | PUT | `/api/question-papers/:id` | Update |
| 5 | DELETE | `/api/question-papers/:id` | Delete (soft) |
| 6 | POST | `/api/question-papers/:id/upload-pdf` | Upload PDF |
| 7 | GET | `/api/question-papers/:id/refresh-url` | Refresh URL |
| 8 | POST | `/api/question-papers/:id/access` | Log access |
| 9 | GET | `/api/question-papers/subject/:subject` | Filter by subject |
| 10 | GET | `/api/question-papers/year/:year` | Filter by year |
| 11 | GET | `/api/question-papers/semester/:semester` | Filter by semester |
| 12 | GET | `/api/question-papers/exam-type/:type` | Filter by type |

**See `QUESTION_PAPER_ALL_ROUTES.md` for complete details!**

---

## 📝 Request Body Examples

### Create Question Paper
```json
{
  "title": "Midterm Exam - Data Structures",
  "subject": "Data Structures",
  "year": 2,
  "semester": 3,
  "exam_type": "midterm",
  "marks": 100
}
```

**Required:** title, subject, year, semester  
**Optional:** description, exam_type, marks, college_id

### Update Question Paper
```json
{
  "title": "Updated Title",
  "marks": 120
}
```

**All fields optional**

### Upload PDF
```
Form Data:
- Field: question_paper
- Type: PDF file
- Max: 50MB
```

### Log Access
```json
{
  "access_type": "view"
}
```

---

## 🗄️ Database Schema (Option 1 - Recommended)

### question_papers Table
```sql
CREATE TABLE question_papers (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  exam_type VARCHAR(20),
  marks INTEGER,
  pdf_url TEXT,
  college_id UUID REFERENCES colleges(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### question_paper_access_logs Table
```sql
CREATE TABLE question_paper_access_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  question_paper_id UUID NOT NULL REFERENCES question_papers(id),
  access_type VARCHAR(20) DEFAULT 'view',
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);
```

---

## 🗄️ Database Changes (Option 2 - Alternative)

### Add Column to Books Table
```sql
ALTER TABLE books 
ADD COLUMN question_paper BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_books_question_paper ON books(question_paper);
```

**Migration file:** `database/migrations/add_question_paper_to_books.sql`

---

## 🔐 Role-Based Access

| Role | Create | View All | View Own College | View Own Year | Update | Delete | Upload |
|------|--------|----------|------------------|---------------|--------|--------|--------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| college_admin | ✅ | ❌ | ✅ (all years) | ✅ | ✅* | ✅* | ✅* |
| student | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| user | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*College admins can only modify their own college's papers

---

## ⚙️ Configuration

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

---

## ✅ What's Working

✅ All 12 API endpoints functional  
✅ Role-based access control  
✅ PDF upload to AWS S3 (max 50MB)  
✅ Secure signed URLs (1-hour expiry)  
✅ URL refresh capability  
✅ Filtering (subject, year, semester, exam type)  
✅ Access logging  
✅ Soft delete  
✅ Complete documentation  

---

## 📚 Documentation Files

1. **QUESTION_PAPER_ALL_ROUTES.md** - Main reference (all routes)
2. **DATABASE_CHANGES_GUIDE.md** - Database setup guide
3. **SETUP_COMPLETE_GUIDE.md** - This file (quick start)
4. **QUESTION_PAPER_QUICK_START.md** - Quick reference
5. **QUESTION_PAPER_SUMMARY.md** - Complete summary

---

## 🎯 Recommended Workflow

### For Development
1. Read `QUESTION_PAPER_ALL_ROUTES.md`
2. Run database migration
3. Test with Postman or cURL
4. Integrate into your frontend

### For Production
1. Backup database
2. Run migration on production DB
3. Verify tables created
4. Test API endpoints
5. Monitor logs

---

## 🚨 Important Notes

1. **2-Step Upload**
   - Create question paper first → Get ID
   - Upload PDF using that ID

2. **URL Expiration**
   - PDF URLs expire after 1 hour
   - Use refresh-url endpoint

3. **File Validation**
   - Only PDF files
   - Max 50MB

4. **Soft Delete**
   - DELETE sets `is_active = false`
   - Data remains in database

5. **Role Filtering**
   - Students: Own college + own year
   - College admins: Own college (all years)
   - Super admins & users: All papers

---

## 🆘 Need Help?

### Check These Files
- **Routes not working?** → See `QUESTION_PAPER_ALL_ROUTES.md`
- **Database issues?** → See `DATABASE_CHANGES_GUIDE.md`
- **Quick reference?** → See `QUESTION_PAPER_QUICK_START.md`

### Common Issues

**Issue: Table doesn't exist**
```bash
# Run migration
psql -U user -d db -f database/migrations/create_question_papers_tables.sql
```

**Issue: Authentication fails**
```bash
# Get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@college.edu","password":"pass123"}'
```

**Issue: File upload fails**
- Check file is PDF
- Check file size < 50MB
- Check AWS credentials in .env

---

## ✨ You're Ready!

Everything is implemented and documented. Just:

1. ✅ Run database migration
2. ✅ Test API with `QUESTION_PAPER_ALL_ROUTES.md`
3. ✅ Start using the feature!

**The Question Paper Management feature is complete and ready to use!** 🎉

---

**Last Updated:** January 29, 2026  
**Status:** ✅ Complete & Production Ready
