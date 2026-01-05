# Requirements Document

## Introduction

This feature adds a `purchased` indicator field to the books API response to help the frontend easily identify which books have been purchased by the authenticated user. Currently, the frontend must cross-reference the books list with the purchased books list to determine purchase status, which is inefficient and requires multiple API calls.

## Glossary

- **System**: The Educational Book Management System backend API
- **User**: An authenticated user with role 'user' who can purchase books
- **Student**: An authenticated user with role 'student' who has free access to their college books
- **Book**: A digital book resource available in the system
- **Purchased_Book**: A book that has been successfully purchased by a user (order status = 'paid')
- **Books_API**: The GET /api/books endpoint that returns a list of books
- **Single_Book_API**: The GET /api/books/:bookId endpoint that returns a single book
- **Purchase_Status**: A boolean indicator (0 or 1) showing whether the authenticated user has purchased a specific book

## Requirements

### Requirement 1: Add Purchase Indicator to Books List API

**User Story:** As a user, I want to see which books I have purchased when I view the books list, so that I can quickly identify my purchased books without making additional API calls.

#### Acceptance Criteria

1. WHEN a user with role 'user' calls the GET /api/books endpoint, THE System SHALL include a `purchased` field in each book object
2. WHEN a book has been purchased by the authenticated user (order status = 'paid'), THE System SHALL set `purchased` to 1
3. WHEN a book has not been purchased by the authenticated user, THE System SHALL set `purchased` to 0
4. WHEN a user with role 'student' calls the GET /api/books endpoint, THE System SHALL set `purchased` to 0 for all books
5. WHEN a user with role 'super_admin' or 'college_admin' calls the GET /api/books endpoint, THE System SHALL set `purchased` to 0 for all books

### Requirement 2: Add Purchase Indicator to Single Book API

**User Story:** As a user, I want to see if I have purchased a specific book when I view its details, so that I can make informed decisions about purchasing or accessing the book.

#### Acceptance Criteria

1. WHEN a user with role 'user' calls the GET /api/books/:bookId endpoint, THE System SHALL include a `purchased` field in the book object
2. WHEN the book has been purchased by the authenticated user (order status = 'paid'), THE System SHALL set `purchased` to 1
3. WHEN the book has not been purchased by the authenticated user, THE System SHALL set `purchased` to 0
4. WHEN a user with role 'student' calls the GET /api/books/:bookId endpoint, THE System SHALL set `purchased` to 0
5. WHEN a user with role 'super_admin' or 'college_admin' calls the GET /api/books/:bookId endpoint, THE System SHALL set `purchased` to 0

### Requirement 3: Maintain API Performance

**User Story:** As a system administrator, I want the purchase indicator feature to have minimal performance impact, so that the books API remains responsive under load.

#### Acceptance Criteria

1. WHEN fetching books with purchase indicators, THE System SHALL use efficient database queries to minimize query count
2. WHEN a user has purchased multiple books, THE System SHALL fetch all purchase statuses in a single database query
3. WHEN the books list contains many books, THE System SHALL not execute N+1 queries for purchase status checks

### Requirement 4: Handle Edge Cases

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that the API remains stable and predictable.

#### Acceptance Criteria

1. WHEN a user has multiple orders for the same book, THE System SHALL set `purchased` to 1 if any order has status 'paid'
2. WHEN a user has an order with status 'failed' or 'refunded', THE System SHALL set `purchased` to 0
3. WHEN the database query for purchase status fails, THE System SHALL default `purchased` to 0 and log the error
4. WHEN an unauthenticated request is made, THE System SHALL return an authentication error before checking purchase status
