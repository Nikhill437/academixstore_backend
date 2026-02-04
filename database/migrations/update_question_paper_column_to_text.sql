-- Migration: Update question_paper column to store URL instead of boolean
-- Date: 2026-02-04
-- Description: Changes question_paper column from BOOLEAN to TEXT to store question paper PDF URLs

-- Drop the existing index
DROP INDEX IF EXISTS idx_books_question_paper;

-- Change column type from BOOLEAN to TEXT
ALTER TABLE books 
ALTER COLUMN question_paper TYPE TEXT USING 
  CASE 
    WHEN question_paper = true THEN NULL 
    ELSE NULL 
  END;

-- Set default to NULL
ALTER TABLE books 
ALTER COLUMN question_paper SET DEFAULT NULL;

-- Allow NULL values
ALTER TABLE books 
ALTER COLUMN question_paper DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN books.question_paper IS 'URL of the question paper PDF file stored in S3';

-- Create new index for faster filtering (on non-null values)
CREATE INDEX idx_books_question_paper_not_null ON books(question_paper) WHERE question_paper IS NOT NULL;

-- Rollback script (if needed)
-- ALTER TABLE books ALTER COLUMN question_paper TYPE BOOLEAN USING (question_paper IS NOT NULL);
-- DROP INDEX IF EXISTS idx_books_question_paper_not_null;
-- CREATE INDEX idx_books_question_paper ON books(question_paper);
