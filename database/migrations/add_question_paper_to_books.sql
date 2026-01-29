-- Migration: Add question_paper column to books table
-- Description: Adds a boolean flag to indicate if a book is a question paper
-- Date: 2026-01-29

-- Add question_paper column to books table
ALTER TABLE books 
ADD COLUMN question_paper BOOLEAN DEFAULT FALSE;

-- Add comment to the column
COMMENT ON COLUMN books.question_paper IS 'Flag to indicate if this book is a question paper (true) or regular book (false)';

-- Create index for faster filtering
CREATE INDEX idx_books_question_paper ON books(question_paper);

-- Update existing books to have question_paper = false (if not already set)
UPDATE books 
SET question_paper = FALSE 
WHERE question_paper IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE books 
ALTER COLUMN question_paper SET NOT NULL;

-- Rollback script (if needed)
-- ALTER TABLE books DROP COLUMN question_paper;
-- DROP INDEX IF EXISTS idx_books_question_paper;
