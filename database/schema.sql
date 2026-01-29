-- Educational Book Subscription System Database Schema
-- PostgreSQL Database Design

-- Enum types for better data integrity
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'student', 'user');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'inactive', 'expired', 'cancelled');
CREATE TYPE book_category_enum AS ENUM ('textbook', 'reference', 'fiction', 'non_fiction', 'academic', 'technical');
CREATE TYPE college_year_enum AS ENUM ('first_year', 'second_year', 'third_year', 'fourth_year', 'graduate');
CREATE TYPE exam_type_enum AS ENUM ('midterm', 'final', 'quiz', 'practice');

-- Users table (unified table for all user types)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Admin/Student specific fields
    college_id UUID REFERENCES colleges(id),
    college_year college_year_enum,
    
    -- User specific fields
    phone VARCHAR(20),
    date_of_birth DATE,
    
    -- Constraints
    CONSTRAINT email_required_for_users CHECK (
        (role = 'user' AND email IS NOT NULL) OR 
        (role != 'user')
    ),
    CONSTRAINT college_required_for_admin_student CHECK (
        (role IN ('admin', 'student') AND college_id IS NOT NULL) OR 
        (role NOT IN ('admin', 'student'))
    ),
    CONSTRAINT year_required_for_student CHECK (
        (role = 'student' AND college_year IS NOT NULL) OR 
        (role != 'student')
    )
);

-- Colleges table
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    isbn VARCHAR(20),
    publisher VARCHAR(255),
    publication_year INTEGER,
    category book_category_enum,
    college_year college_year_enum, -- Which year students can access this book
    
    -- File storage
    pdf_url VARCHAR(500), -- AWS S3 URL
    cover_image_url VARCHAR(500),
    file_size BIGINT, -- in bytes
    
    -- Access control
    college_id UUID REFERENCES colleges(id), -- NULL means available to all individual users
    is_free_for_students BOOLEAN DEFAULT true,
    requires_subscription BOOLEAN DEFAULT false,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT college_books_constraint CHECK (
        (college_id IS NOT NULL AND college_year IS NOT NULL AND is_free_for_students = true) OR
        (college_id IS NULL AND requires_subscription IN (true, false))
    )
);

-- Subscription Plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    features JSONB, -- Array of features
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status subscription_status_enum DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    auto_renewal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_subscription_dates CHECK (end_date > start_date),
    CONSTRAINT user_subscription_role_check CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'user')
    )
);

-- Advertisements table
CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    
    -- Targeting
    college_id UUID REFERENCES colleges(id), -- NULL means global ad
    target_roles user_role_enum[], -- Array of roles to show ad to
    target_years college_year_enum[], -- Array of college years
    
    -- Display settings
    position VARCHAR(50), -- 'banner', 'sidebar', 'popup', etc.
    priority INTEGER DEFAULT 0,
    
    -- Scheduling
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_ad_dates CHECK (
        end_date IS NULL OR end_date > start_date
    )
);

-- Book Access Logs table (for tracking student book access)
CREATE TABLE book_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    access_type VARCHAR(20) DEFAULT 'view', -- 'view', 'download'
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- User Sessions table (for JWT token management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);

-- Question Papers table
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

-- Question Paper Access Logs table
CREATE TABLE question_paper_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    question_paper_id UUID REFERENCES question_papers(id) ON DELETE CASCADE NOT NULL,
    access_type VARCHAR(20) DEFAULT 'view',
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_college_id ON users(college_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_books_college_id ON books(college_id);
CREATE INDEX idx_books_college_year ON books(college_year);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_created_by ON books(created_by);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

CREATE INDEX idx_advertisements_college_id ON advertisements(college_id);
CREATE INDEX idx_advertisements_active ON advertisements(is_active);

CREATE INDEX idx_book_access_logs_user_id ON book_access_logs(user_id);
CREATE INDEX idx_book_access_logs_book_id ON book_access_logs(book_id);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_question_papers_college_id ON question_papers(college_id);
CREATE INDEX idx_question_papers_year ON question_papers(year);
CREATE INDEX idx_question_papers_semester ON question_papers(semester);
CREATE INDEX idx_question_papers_subject ON question_papers(subject);
CREATE INDEX idx_question_papers_created_by ON question_papers(created_by);
CREATE INDEX idx_question_papers_is_active ON question_papers(is_active);
CREATE INDEX idx_question_papers_exam_type ON question_papers(exam_type);
CREATE INDEX idx_question_papers_college_year ON question_papers(college_id, year);
CREATE INDEX idx_question_papers_college_year_semester ON question_papers(college_id, year, semester);

CREATE INDEX idx_qp_access_logs_user_id ON question_paper_access_logs(user_id);
CREATE INDEX idx_qp_access_logs_question_paper_id ON question_paper_access_logs(question_paper_id);
CREATE INDEX idx_qp_access_logs_accessed_at ON question_paper_access_logs(accessed_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_papers_updated_at BEFORE UPDATE ON question_papers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Super Admin user (password should be hashed in real implementation)
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name) 
VALUES (
    gen_random_uuid(),
    'superadmin',
    'superadmin@bookapp.com',
    '$2b$10$example_hash_here', -- This should be properly hashed
    'super_admin',
    'Super',
    'Admin'
);

-- Sample subscription plans
INSERT INTO subscription_plans (name, description, price, duration_months, features) VALUES
('Basic Plan', 'Access to basic book collection', 9.99, 1, '["Basic book access", "Mobile app", "Download for offline reading"]'),
('Premium Plan', 'Access to premium book collection with additional features', 19.99, 3, '["Premium book access", "Mobile & Web app", "Unlimited downloads", "Audio books", "Priority support"]'),
('Annual Plan', 'Full year access with maximum savings', 99.99, 12, '["All book access", "Mobile & Web app", "Unlimited downloads", "Audio books", "Priority support", "Exclusive content"]');