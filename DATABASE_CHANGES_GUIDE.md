# Database Changes Guide - Question Paper Feature

## 📋 Overview

This guide explains all database changes needed for the Question Paper Management feature.

---

## 🗄️ Option 1: Separate Question Papers Table (RECOMMENDED - Already Implemented)

### Tables Created

#### 1. `question_papers` Table
```sql
CREATE TABLE question_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  exam_type VARCHAR(20) CHECK (exam_type IN ('midterm', 'final', 'quiz', 'practice')),
  marks INTEGER CHECK (marks >= 0),
  pdf_url TEXT,
  college_id UUID REFERENCES colleges(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `question_paper_access_logs` Table
```sql
CREATE TABLE question_paper_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  question_paper_id UUID NOT NULL REFERENCES question_papers(id),
  access_type VARCHAR(20) DEFAULT 'view',
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);
```

#### 3. Indexes
```sql
-- question_papers indexes
CREATE INDEX idx_question_papers_college_id ON question_papers(college_id);
CREATE INDEX idx_question_papers_year ON question_papers(year);
CREATE INDEX idx_question_papers_semester ON question_papers(semester);
CREATE INDEX idx_question_papers_subject ON question_papers(subject);
CREATE INDEX idx_question_papers_created_by ON question_papers(created_by);
CREATE INDEX idx_question_papers_is_active ON question_papers(is_active);

-- question_paper_access_logs indexes
CREATE INDEX idx_qp_access_logs_user_id ON question_paper_access_logs(user_id);
CREATE INDEX idx_qp_access_logs_question_paper_id ON question_paper_access_logs(question_paper_id);
CREATE INDEX idx_qp_access_logs_accessed_at ON question_paper_access_logs(accessed_at);
```

#### 4. Triggers
```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_question_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_papers_updated_at
BEFORE UPDATE ON question_papers
FOR EACH ROW
EXECUTE FUNCTION update_question_papers_updated_at();
```

### Migration File
**Location:** `database/migrations/create_question_papers_tables.sql`

### How to Run
```bash
# Using psql
psql -U your_username -d your_database -f database/migrations/create_question_papers_tables.sql

# Or using npm script (if configured)
npm run migrate
```

---

## 🗄️ Option 2: Add Column to Books Table (Alternative)

If you want to use the existing `books` table for question papers instead of a separate table:

### Migration File
**Location:** `database/migrations/add_question_paper_to_books.sql`

### Changes to Books Table
```sql
-- Add question_paper boolean column
ALTER TABLE books 
ADD COLUMN question_paper BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN books.question_paper IS 'Flag to indicate if this book is a question paper';

-- Create index
CREATE INDEX idx_books_question_paper ON books(question_paper);

-- Set default for existing records
UPDATE books 
SET question_paper = FALSE 
WHERE question_paper IS NULL;

-- Make NOT NULL
ALTER TABLE books 
ALTER COLUMN question_paper SET NOT NULL;
```

### How to Run
```bash
psql -U your_username -d your_database -f database/migrations/add_question_paper_to_books.sql
```

### Rollback (if needed)
```sql
ALTER TABLE books DROP COLUMN question_paper;
DROP INDEX IF EXISTS idx_books_question_paper;
```

---

## 📊 Comparison: Separate Table vs Books Table

| Feature | Separate Table | Books Table Column |
|---------|---------------|-------------------|
| **Data Separation** | ✅ Clean separation | ❌ Mixed data |
| **Schema Flexibility** | ✅ Custom fields | ❌ Limited to book fields |
| **Query Performance** | ✅ Optimized indexes | ⚠️ Shared indexes |
| **Code Complexity** | ⚠️ Separate models | ✅ Single model |
| **Future Scalability** | ✅ Easy to extend | ❌ Harder to extend |
| **Access Logging** | ✅ Dedicated table | ❌ Shares with books |
| **Recommended** | ✅ **YES** | ❌ No |

---

## 🎯 Recommended Approach: Separate Table

### Why Separate Table is Better

1. **Clean Data Model**
   - Question papers have different attributes (exam_type, marks)
   - Books have different attributes (ISBN, publisher, pages)
   - Mixing them creates confusion

2. **Better Performance**
   - Dedicated indexes for question paper queries
   - No need to filter `question_paper = true/false` in every query
   - Smaller table size for each entity

3. **Easier Maintenance**
   - Clear separation of concerns
   - Easier to add question paper-specific features
   - No risk of breaking book functionality

4. **Dedicated Access Logging**
   - Separate access logs for analytics
   - Different tracking requirements

5. **Future Scalability**
   - Easy to add question paper versioning
   - Easy to add question paper-specific features
   - No impact on books table

---

## 🚀 Implementation Steps

### Step 1: Run Migration
```bash
# Navigate to project root
cd /path/to/your/project

# Run the migration
psql -U your_username -d your_database -f database/migrations/create_question_papers_tables.sql
```

### Step 2: Verify Tables Created
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('question_papers', 'question_paper_access_logs');

-- Check columns
\d question_papers
\d question_paper_access_logs
```

### Step 3: Verify Indexes
```sql
-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('question_papers', 'question_paper_access_logs');
```

### Step 4: Test Insert
```sql
-- Test insert
INSERT INTO question_papers (
  title, 
  subject, 
  year, 
  semester, 
  exam_type, 
  marks,
  created_by
) VALUES (
  'Test Exam - Data Structures',
  'Data Structures',
  2,
  3,
  'midterm',
  100,
  'your-user-uuid-here'
);

-- Verify
SELECT * FROM question_papers;
```

---

## 🔧 Database Configuration

### Environment Variables
Make sure these are set in your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# AWS S3 Configuration (for PDF storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

---

## 📝 Schema Updates in Code

### Sequelize Model (Already Created)
**Location:** `src/models/QuestionPaper.js`

The model is already configured to work with the `question_papers` table.

### Model Associations
```javascript
// In src/models/index.js
QuestionPaper.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
QuestionPaper.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
QuestionPaperAccessLog.belongsTo(User, { foreignKey: 'user_id' });
QuestionPaperAccessLog.belongsTo(QuestionPaper, { foreignKey: 'question_paper_id' });
```

---

## 🧪 Testing Database Changes

### Test 1: Create Question Paper
```sql
INSERT INTO question_papers (
  title, 
  subject, 
  year, 
  semester, 
  exam_type, 
  marks,
  college_id,
  created_by
) VALUES (
  'Midterm Exam - Operating Systems',
  'Operating Systems',
  3,
  5,
  'midterm',
  100,
  'college-uuid-here',
  'user-uuid-here'
);
```

### Test 2: Query by Subject
```sql
SELECT * FROM question_papers 
WHERE subject = 'Operating Systems' 
AND is_active = true;
```

### Test 3: Query by Year and Semester
```sql
SELECT * FROM question_papers 
WHERE year = 3 
AND semester = 5 
AND is_active = true;
```

### Test 4: Log Access
```sql
INSERT INTO question_paper_access_logs (
  user_id,
  question_paper_id,
  access_type,
  ip_address,
  user_agent
) VALUES (
  'user-uuid-here',
  'question-paper-uuid-here',
  'view',
  '192.168.1.1',
  'Mozilla/5.0...'
);
```

### Test 5: Soft Delete
```sql
UPDATE question_papers 
SET is_active = false 
WHERE id = 'question-paper-uuid-here';

-- Verify it doesn't appear in active queries
SELECT * FROM question_papers WHERE is_active = true;
```

---

## 🔄 Migration Rollback

If you need to rollback the changes:

```sql
-- Drop tables
DROP TABLE IF EXISTS question_paper_access_logs CASCADE;
DROP TABLE IF EXISTS question_papers CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_question_papers_updated_at() CASCADE;

-- Drop indexes (if they weren't dropped with CASCADE)
DROP INDEX IF EXISTS idx_question_papers_college_id;
DROP INDEX IF EXISTS idx_question_papers_year;
DROP INDEX IF EXISTS idx_question_papers_semester;
DROP INDEX IF EXISTS idx_question_papers_subject;
DROP INDEX IF EXISTS idx_question_papers_created_by;
DROP INDEX IF EXISTS idx_question_papers_is_active;
DROP INDEX IF EXISTS idx_qp_access_logs_user_id;
DROP INDEX IF EXISTS idx_qp_access_logs_question_paper_id;
DROP INDEX IF EXISTS idx_qp_access_logs_accessed_at;
```

---

## 📊 Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         users                                │
│  - id (UUID, PK)                                            │
│  - email, full_name, role, etc.                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ created_by (FK)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    question_papers                           │
│  - id (UUID, PK)                                            │
│  - title (VARCHAR 500)                                      │
│  - subject (VARCHAR 100)                                    │
│  - year (INTEGER 1-4)                                       │
│  - semester (INTEGER 1-8)                                   │
│  - exam_type (ENUM)                                         │
│  - marks (INTEGER)                                          │
│  - pdf_url (TEXT)                                           │
│  - college_id (UUID, FK) ──────────┐                       │
│  - is_active (BOOLEAN)              │                       │
│  - created_by (UUID, FK)            │                       │
│  - created_at, updated_at           │                       │
└────────────────────┬────────────────┼───────────────────────┘
                     │                │
                     │                │
                     │                ▼
                     │    ┌─────────────────────────┐
                     │    │       colleges          │
                     │    │  - id (UUID, PK)       │
                     │    │  - name, code, etc.    │
                     │    └─────────────────────────┘
                     │
                     │ question_paper_id (FK)
                     │
┌────────────────────▼────────────────────────────────────────┐
│              question_paper_access_logs                      │
│  - id (UUID, PK)                                            │
│  - user_id (UUID, FK) ──────────┐                          │
│  - question_paper_id (UUID, FK) │                          │
│  - access_type (VARCHAR)         │                          │
│  - accessed_at (TIMESTAMP)       │                          │
│  - ip_address (INET)             │                          │
│  - user_agent (TEXT)             │                          │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                                   │ user_id (FK)
                                   │
                     ┌─────────────▼─────────────┐
                     │         users             │
                     │  (same as above)          │
                     └───────────────────────────┘
```

---

## ✅ Verification Checklist

After running migrations, verify:

- [ ] `question_papers` table exists
- [ ] `question_paper_access_logs` table exists
- [ ] All columns have correct data types
- [ ] All indexes are created
- [ ] Foreign key constraints are working
- [ ] Triggers are created and working
- [ ] Can insert test data
- [ ] Can query test data
- [ ] Soft delete works (is_active flag)
- [ ] Access logging works

---

## 🆘 Troubleshooting

### Issue: Table already exists
```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'question_papers';

-- Drop and recreate if needed
DROP TABLE IF EXISTS question_paper_access_logs CASCADE;
DROP TABLE IF EXISTS question_papers CASCADE;
-- Then run migration again
```

### Issue: Foreign key constraint fails
```sql
-- Check if referenced tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('users', 'colleges');

-- Verify UUIDs exist
SELECT id FROM users WHERE id = 'your-uuid-here';
SELECT id FROM colleges WHERE id = 'your-uuid-here';
```

### Issue: Trigger not working
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'question_papers';

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS trigger_update_question_papers_updated_at ON question_papers;
-- Then run trigger creation SQL again
```

---

## 📞 Support

If you encounter issues:
1. Check PostgreSQL logs
2. Verify all prerequisite tables exist (users, colleges)
3. Ensure UUID extension is enabled: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
4. Check database user permissions

---

**Last Updated:** January 29, 2026  
**Database Version:** PostgreSQL 12+
