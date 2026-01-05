# Requirements Document

## Introduction

This document specifies the requirements for implementing role-based book filtering in the library management system. The system currently displays books based on college association, but needs enhanced filtering logic to ensure students only see books relevant to their academic year, while maintaining appropriate access levels for other user roles.

## Glossary

- **System**: The library management system backend API
- **Student**: A user with role 'student' who has a college_id and year field
- **User**: A user with role 'user' who can access all books
- **College_Admin**: A user with role 'college_admin' who manages books for their college
- **Super_Admin**: A user with role 'super_admin' who has full system access
- **Book**: A digital book resource with metadata including year, semester, and college association
- **Year**: The academic year field (e.g., "F.Y.M.Sc", "S.Y.B.Sc") stored in both User and Book models
- **College_Id**: UUID linking users and books to specific colleges

## Requirements

### Requirement 1: Student Year-Based Book Filtering

**User Story:** As a student, I want to see only books that match my academic year, so that I can focus on relevant course materials without being overwhelmed by books from other years.

#### Acceptance Criteria

1. WHEN a student user requests the book list, THE System SHALL filter books to match the student's year field exactly
2. WHEN a student user has a year field value, THE System SHALL return only books where book.year equals user.year
3. WHEN a student user requests books, THE System SHALL maintain the existing college_id filter in addition to the year filter
4. WHEN a student user has no year field set, THE System SHALL return an empty book list with an appropriate message
5. WHEN a student user requests a specific book by ID that does not match their year, THE System SHALL return an access denied error

### Requirement 2: User Role Full Book Access

**User Story:** As a user (non-student, non-admin), I want to see all available books in the system, so that I can browse and purchase any book regardless of year or college.

#### Acceptance Criteria

1. WHEN a user with role 'user' requests the book list, THE System SHALL return all active books without year filtering
2. WHEN a user with role 'user' requests the book list, THE System SHALL return all active books without college filtering
3. WHEN a user with role 'user' requests a specific book by ID, THE System SHALL grant access to any active book
4. WHEN a user with role 'user' requests books, THE System SHALL include books from all colleges and all years

### Requirement 3: Super Admin Full Book Access

**User Story:** As a super admin, I want to see all books in the system including those from all colleges and years, so that I can manage and oversee the entire book catalog.

#### Acceptance Criteria

1. WHEN a super_admin requests the book list, THE System SHALL return all active books without any filtering
2. WHEN a super_admin requests the book list, THE System SHALL include college information for each book
3. WHEN a super_admin requests a specific book by ID, THE System SHALL grant access to any book regardless of college or year
4. WHEN a super_admin requests books, THE System SHALL maintain existing super admin access patterns

### Requirement 4: College Admin Scoped Book Access

**User Story:** As a college admin, I want to see only the books that belong to my college, so that I can manage my institution's book catalog without seeing books from other colleges.

#### Acceptance Criteria

1. WHEN a college_admin requests the book list, THE System SHALL filter books to match the admin's college_id
2. WHEN a college_admin requests the book list, THE System SHALL return books from all years within their college
3. WHEN a college_admin requests a specific book by ID from another college, THE System SHALL return an access denied error
4. WHEN a college_admin requests books, THE System SHALL maintain existing college-based filtering without year restrictions

### Requirement 5: Backward Compatibility and Error Handling

**User Story:** As a system administrator, I want the filtering logic to handle edge cases gracefully, so that the system remains stable and provides clear error messages.

#### Acceptance Criteria

1. WHEN any user requests books and the database query fails, THE System SHALL return a 500 error with appropriate error message
2. WHEN a student has a null or undefined year field, THE System SHALL return an empty list with a descriptive message
3. WHEN filtering is applied, THE System SHALL maintain existing query parameters (category, semester) as additional filters
4. WHEN the isAccessibleBy method is called, THE System SHALL apply the same role-based year filtering logic
5. WHEN existing API response formats are used, THE System SHALL maintain backward compatibility with current response structures
