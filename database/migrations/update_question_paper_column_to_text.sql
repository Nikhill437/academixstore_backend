-- Migration: Update question_paper column to store URL instead of boolean
-- Date: 2026-02-04
-- Description: Changes question_paper column from BOOLEAN to TEXT to store question paper PDF URLs

-- Step 1: Drop the existing index
DROP INDEX IF EXISTS idx_books_question_paper;

-- Step 2: Add a temporary column to store URLs
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS question_paper_url TEXT;

-- Step 3: Drop the old boolean column
ALTER TABLE books 
DROP COLUMN IF EXISTS question_paper;

-- Step 4: Rename the new column to question_paper
ALTER TABLE books 
RENAME COLUMN question_paper_url TO question_paper;

-- Step 5: Add comment
COMMENT ON COLUMN books.question_paper IS 'URL of the question paper PDF file stored in S3';

-- Step 6: Create new index for faster filtering (on non-null values)
CREATE INDEX idx_books_question_paper_not_null ON books(question_paper) WHERE question_paper IS NOT NULL;

-- Rollback script (if needed)
-- ALTER TABLE books DROP COLUMN question_paper;
-- ALTER TABLE books ADD COLUMN question_paper BOOLEAN DEFAULT FALSE;
-- CREATE INDEX idx_books_question_paper ON books(question_paper);

