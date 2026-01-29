-- Migration: Create Question Papers Tables
-- Description: Creates question_papers and question_paper_access_logs tables with indexes
-- Date: 2026-01-25

-- Create exam_type enum
CREATE TYPE exam_type_enum AS ENUM ('midterm', 'final', 'quiz', 'practice');

-- Create question_papers table
CREATE TABLE question_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    exam_type exam_type_enum,
    marks INTEGER,
    pdf_url TEXT,
    college_id UUID REFERENCES colleges(id),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT question_papers_title_not_empty CHECK (title <> ''),
    CONSTRAINT question_papers_subject_not_empty CHECK (subject <> ''),
    CONSTRAINT question_papers_year_range CHECK (year >= 1 AND year <= 4),
    CONSTRAINT question_papers_semester_range CHECK (semester >= 1 AND semester <= 8),
    CONSTRAINT question_papers_marks_positive CHECK (marks IS NULL OR marks >= 0)
);

-- Create question_paper_access_logs table
CREATE TABLE question_paper_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    question_paper_id UUID REFERENCES question_papers(id) ON DELETE CASCADE NOT NULL,
    access_type VARCHAR(20) DEFAULT 'view',
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for question_papers table
CREATE INDEX idx_question_papers_college_id ON question_papers(college_id);
CREATE INDEX idx_question_papers_year ON question_papers(year);
CREATE INDEX idx_question_papers_semester ON question_papers(semester);
CREATE INDEX idx_question_papers_subject ON question_papers(subject);
CREATE INDEX idx_question_papers_created_by ON question_papers(created_by);
CREATE INDEX idx_question_papers_is_active ON question_papers(is_active);
CREATE INDEX idx_question_papers_exam_type ON question_papers(exam_type);

-- Create composite indexes for common queries
CREATE INDEX idx_question_papers_college_year ON question_papers(college_id, year);
CREATE INDEX idx_question_papers_college_year_semester ON question_papers(college_id, year, semester);

-- Create indexes for question_paper_access_logs table
CREATE INDEX idx_qp_access_logs_user_id ON question_paper_access_logs(user_id);
CREATE INDEX idx_qp_access_logs_question_paper_id ON question_paper_access_logs(question_paper_id);
CREATE INDEX idx_qp_access_logs_accessed_at ON question_paper_access_logs(accessed_at);

-- Create trigger for updated_at timestamp on question_papers
CREATE TRIGGER update_question_papers_updated_at 
    BEFORE UPDATE ON question_papers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE question_papers IS 'Stores question paper metadata and S3 file references';
COMMENT ON TABLE question_paper_access_logs IS 'Logs user access to question papers for analytics';
COMMENT ON COLUMN question_papers.year IS 'Academic year (1-4 for undergraduate)';
COMMENT ON COLUMN question_papers.semester IS 'Semester number (1-8)';
COMMENT ON COLUMN question_papers.exam_type IS 'Type of examination (midterm, final, quiz, practice)';
COMMENT ON COLUMN question_papers.college_id IS 'NULL means question paper is available globally';

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS question_paper_access_logs CASCADE;
-- DROP TABLE IF EXISTS question_papers CASCADE;
-- DROP TYPE IF EXISTS exam_type_enum CASCADE;
