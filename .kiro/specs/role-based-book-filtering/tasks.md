# Implementation Plan: Role-Based Book Filtering

## Overview

This implementation plan breaks down the role-based book filtering feature into discrete coding tasks. The approach focuses on modifying the existing `BookController` methods and the `Book.isAccessibleBy()` instance method to apply role-specific filtering rules, with particular emphasis on year-based filtering for students.

## Tasks

- [x] 1. Update Book.isAccessibleBy() method with year-based filtering for students
  - Modify the `isAccessibleBy()` instance method in `src/models/Book.js`
  - Add year comparison logic for student role
  - Handle null/undefined year field for students
  - Maintain existing logic for other roles (super_admin, college_admin, user)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for isAccessibleBy() year filtering
  - **Property 1: Student Year Filtering Consistency**
  - **Validates: Requirements 1.1, 1.2**
  - Generate random student users with various year values
  - Generate random books with various year values
  - Verify students can only access books matching their year

- [ ]* 1.2 Write unit tests for isAccessibleBy() edge cases
  - Test student with null year field (should return false)
  - Test student accessing same-year book (should return true)
  - Test student accessing different-year book (should return false)
  - Test user role accessing any book (should return true)
  - Test super_admin accessing any book (should return true)
  - Test college_admin accessing own college books (should return true regardless of year)
  - _Requirements: 1.4, 1.5, 2.3, 3.3, 4.3_

- [ ] 2. Update BookController.getBooks() with role-based year filtering
  - Modify the `getBooks()` method in `src/controllers/bookController.js`
  - Add year filter to whereClause for student role
  - Ensure user and super_admin roles have no year filtering
  - Ensure college_admin role has college filtering but no year filtering
  - Handle students with null/undefined year field
  - Maintain existing query parameter filters (category, semester)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1, 4.2, 5.3_

- [ ]* 2.1 Write property test for getBooks() student filtering
  - **Property 2: Student College and Year Conjunction**
  - **Validates: Requirements 1.3**
  - Generate random student users with college_id and year
  - Generate random book collections
  - Verify returned books match both college_id AND year

- [ ]* 2.2 Write property test for getBooks() user role access
  - **Property 3: User Role Unrestricted Access**
  - **Validates: Requirements 2.1, 2.2, 2.4**
  - Generate random users with role 'user'
  - Generate random book collections
  - Verify all active books are returned without filtering

- [ ]* 2.3 Write property test for getBooks() super admin access
  - **Property 4: Super Admin Unrestricted Access**
  - **Validates: Requirements 3.1, 3.4**
  - Generate random users with role 'super_admin'
  - Generate random book collections
  - Verify all active books are returned without filtering

- [ ]* 2.4 Write property test for getBooks() college admin filtering
  - **Property 5: College Admin College-Only Filtering**
  - **Validates: Requirements 4.1, 4.2, 4.4**
  - Generate random college_admin users with college_id
  - Generate random book collections with various years
  - Verify returned books match admin's college_id
  - Verify books from all years are included

- [ ]* 2.5 Write property test for query parameter preservation
  - **Property 8: Query Parameter Preservation**
  - **Validates: Requirements 5.3**
  - Generate random users with various roles
  - Generate random query parameters (category, semester)
  - Verify role-based filters work in conjunction with query filters

- [ ]* 2.6 Write unit tests for getBooks() error handling
  - Test student with null year returns empty list with message
  - Test database query failure returns 500 error
  - Test response format matches existing API structure
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 3. Update BookController.getBook() to use enhanced isAccessibleBy()
  - Verify the `getBook()` method in `src/controllers/bookController.js` correctly uses `isAccessibleBy()`
  - Ensure year-based access control is enforced for individual book requests
  - Test that students cannot access books from different years
  - Maintain existing error responses (403 for access denied)
  - _Requirements: 1.5, 4.3_

- [ ]* 3.1 Write property test for access control consistency
  - **Property 6: Access Control Consistency**
  - **Validates: Requirements 1.5, 4.3, 5.5**
  - Generate random user-book pairs
  - Verify `isAccessibleBy()` result matches filtering behavior in `getBooks()`
  - Ensure consistent access control across list and individual endpoints

- [ ]* 3.2 Write unit tests for getBook() access control
  - Test student accessing same-year book (should succeed)
  - Test student accessing different-year book (should return 403)
  - Test user accessing any book (should succeed)
  - Test college_admin accessing other college's book (should return 403)
  - _Requirements: 1.5, 4.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all unit tests and property-based tests
  - Verify no regressions in existing functionality
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Add error handling for edge cases
  - Add descriptive error message for students with null year field
  - Ensure backward compatibility with existing error response formats
  - Add logging for debugging year-based filtering issues
  - _Requirements: 5.1, 5.2, 5.5_

- [ ]* 5.1 Write property test for empty year handling
  - **Property 7: Empty Year Handling**
  - **Validates: Requirements 1.4, 5.2**
  - Generate random student users with null/undefined year
  - Verify empty book list is returned
  - Verify appropriate message is included

- [ ]* 5.2 Write unit tests for error response formats
  - Test error response structure matches existing format
  - Test error codes are consistent with existing patterns
  - Test error messages are descriptive and helpful
  - _Requirements: 5.1, 5.5_

- [ ] 6. Final checkpoint - Integration testing
  - Test complete flow with different user roles
  - Verify API responses match expected formats
  - Ensure performance is acceptable (under 200ms)
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing API
- No database schema changes are required
- Fast-check library will be used for property-based testing (needs to be installed)
