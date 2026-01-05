# Implementation Plan: Book Purchased Indicator

## Overview

This implementation adds a `purchased` field to the books API responses, indicating whether the authenticated user has purchased each book. The implementation focuses on efficient database queries and proper handling of different user roles.

## Tasks

- [-] 1. Add helper function to check purchase status
  - Create `_checkPurchaseStatus(userId, bookIds)` method in BookController
  - Query orders table with single query using `Op.in` for multiple book IDs
  - Return Set of purchased book IDs for O(1) lookup
  - Handle database errors gracefully by returning empty Set
  - _Requirements: 3.1, 3.2, 3.3, 4.3_

- [ ] 1.1 Write property test for purchase status query efficiency
  - **Property 6: Query Efficiency**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [-] 2. Add helper function to add purchased field to books
  - Create `_addPurchasedField(books, userId, userRole)` method in BookController
  - Handle both single book object and array of books
  - For non-'user' roles, set purchased = 0 for all books
  - For 'user' role, call `_checkPurchaseStatus` and set purchased based on result
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Write property test for purchased field existence
  - **Property 1: Purchased Field Exists**
  - **Validates: Requirements 1.1, 2.1**

- [ ] 2.2 Write property test for purchase status accuracy
  - **Property 2: Purchase Status Accuracy for Users**
  - **Validates: Requirements 1.2, 1.3, 2.2, 2.3**

- [ ] 2.3 Write property test for non-user roles
  - **Property 3: Non-User Roles Always Show Unpurchased**
  - **Validates: Requirements 1.4, 1.5, 2.4, 2.5**

- [-] 3. Modify getBooks() to include purchased field
  - Import Op from sequelize for query operations
  - After fetching books and adding signed URLs, call `_addPurchasedField`
  - Pass userId, userRole, and books array to helper
  - Ensure purchased field is added before returning response
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3.1 Write unit test for getBooks with purchased field
  - Test user with paid order sees purchased = 1
  - Test user without order sees purchased = 0
  - Test student always sees purchased = 0
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [-] 4. Modify getBook() to include purchased field
  - After fetching single book and adding signed URL, call `_addPurchasedField`
  - Pass userId, userRole, and single book object to helper
  - Ensure purchased field is added before returning response
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4.1 Write unit test for getBook with purchased field
  - Test user with paid order sees purchased = 1
  - Test user without order sees purchased = 0
  - Test admin always sees purchased = 0
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 5. Add edge case handling
  - Ensure multiple orders for same book are handled correctly
  - Ensure failed/refunded orders don't count as purchased
  - Add error logging for database query failures
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5.1 Write property test for multiple orders
  - **Property 4: Multiple Orders Handled Correctly**
  - **Validates: Requirements 4.1**

- [ ] 5.2 Write property test for failed orders
  - **Property 5: Failed Orders Don't Count as Purchased**
  - **Validates: Requirements 4.2**

- [ ] 5.3 Write unit test for database error handling
  - Mock Order.findAll to throw error
  - Verify purchased defaults to 0
  - Verify error is logged
  - _Requirements: 4.3_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify API responses include purchased field
  - Check that query count is optimized
  - Ask the user if questions arise

- [ ] 7. Integration testing
  - Test end-to-end GET /api/books with purchased field
  - Test end-to-end GET /api/books/:bookId with purchased field
  - Test with different user roles
  - Test with various order statuses
  - _Requirements: All_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The checkpoint ensures incremental validation before final integration
