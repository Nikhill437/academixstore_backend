# Design Document: Book Purchased Indicator

## Overview

This feature enhances the books API endpoints (GET /api/books and GET /api/books/:bookId) by adding a `purchased` field to each book object in the response. The field indicates whether the authenticated user has purchased the book, making it easier for the frontend to display purchase status without additional API calls.

The implementation will:
- Add a `purchased` field (0 or 1) to book responses
- Query the orders table efficiently to determine purchase status
- Handle different user roles appropriately (only 'user' role can purchase books)
- Maintain backward compatibility with existing API consumers

## Architecture

### Current System

The system currently has:
- **Book Controller** (`src/controllers/bookController.js`): Handles book-related operations
- **Order Model** (`src/models/Order.js`): Tracks book purchases with Razorpay integration
- **Books API**: Returns book lists and single book details with signed URLs for PDFs

### Proposed Changes

We will modify the Book Controller to:
1. Check if the authenticated user has purchased each book
2. Add the `purchased` field to the response
3. Use efficient database queries to avoid N+1 query problems

## Components and Interfaces

### Modified Components

#### 1. BookController.getBooks()
**Location**: `src/controllers/bookController.js`

**Current Behavior**:
- Fetches books based on user role and filters
- Adds signed URLs for PDF access
- Returns array of book objects

**New Behavior**:
- After fetching books, query orders table for purchase status
- Add `purchased` field to each book object
- Only query for users with role 'user'

**Interface Changes**:
```javascript
// Response format (existing fields + new field)
{
  success: true,
  data: {
    books: [
      {
        id: "uuid",
        name: "Book Title",
        // ... existing fields ...
        purchased: 1  // NEW FIELD: 0 or 1
      }
    ],
    count: number
  }
}
```

#### 2. BookController.getBook()
**Location**: `src/controllers/bookController.js`

**Current Behavior**:
- Fetches single book by ID
- Checks access permissions
- Adds signed URL for PDF access
- Returns book object

**New Behavior**:
- After fetching book, check if user has purchased it
- Add `purchased` field to book object
- Only query for users with role 'user'

**Interface Changes**:
```javascript
// Response format (existing fields + new field)
{
  success: true,
  data: {
    book: {
      id: "uuid",
      name: "Book Title",
      // ... existing fields ...
      purchased: 1  // NEW FIELD: 0 or 1
    }
  }
}
```

### Helper Functions

#### _checkPurchaseStatus(userId, bookIds)
**Purpose**: Efficiently check which books have been purchased by a user

**Parameters**:
- `userId` (UUID): The authenticated user's ID
- `bookIds` (Array<UUID>): Array of book IDs to check

**Returns**: 
- `Set<UUID>`: Set of book IDs that have been purchased (status = 'paid')

**Implementation**:
```javascript
async _checkPurchaseStatus(userId, bookIds) {
  // Query orders table for paid orders
  const purchasedOrders = await Order.findAll({
    where: {
      user_id: userId,
      book_id: { [Op.in]: bookIds },
      status: 'paid'
    },
    attributes: ['book_id'],
    raw: true
  });
  
  // Return Set of purchased book IDs
  return new Set(purchasedOrders.map(order => order.book_id));
}
```

#### _addPurchasedField(books, userId, userRole)
**Purpose**: Add the `purchased` field to book objects

**Parameters**:
- `books` (Array<Object> | Object): Book object(s) to modify
- `userId` (UUID): The authenticated user's ID
- `userRole` (string): The user's role

**Returns**: 
- Modified book object(s) with `purchased` field

**Logic**:
1. If userRole !== 'user', set purchased = 0 for all books
2. If userRole === 'user', query purchase status and set accordingly
3. Handle both single book and array of books

## Data Models

### Existing Models (No Changes Required)

#### Order Model
```javascript
{
  id: UUID,
  user_id: UUID,
  book_id: UUID,
  status: ENUM('created', 'pending', 'paid', 'failed', 'refunded'),
  // ... other fields
}
```

**Relevant Fields**:
- `user_id`: Links to the user who made the purchase
- `book_id`: Links to the purchased book
- `status`: Only 'paid' status indicates successful purchase

#### Book Model
No changes required - the `purchased` field is computed dynamically and not stored in the database.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Purchased Field Exists

*For any* user with role 'user' and any books API call (list or single book), the response should include a `purchased` field in each book object.

**Validates: Requirements 1.1, 2.1**

### Property 2: Purchase Status Accuracy for Users

*For any* user with role 'user' and any book, the `purchased` field should be 1 if and only if there exists at least one order with status 'paid' for that user-book combination, and 0 otherwise.

**Validates: Requirements 1.2, 1.3, 2.2, 2.3**

### Property 3: Non-User Roles Always Show Unpurchased

*For any* user with role 'student', 'super_admin', or 'college_admin', and any book, the `purchased` field should always be 0 regardless of any orders that may exist.

**Validates: Requirements 1.4, 1.5, 2.4, 2.5**

### Property 4: Multiple Orders Handled Correctly

*For any* user who has multiple orders for the same book with different statuses, the `purchased` field should be 1 if at least one order has status 'paid', regardless of other order statuses.

**Validates: Requirements 4.1**

### Property 5: Failed Orders Don't Count as Purchased

*For any* user with one or more orders that have status 'failed' or 'refunded' but no 'paid' orders for a book, the `purchased` field should be 0.

**Validates: Requirements 4.2**

### Property 6: Query Efficiency

*For any* books list request with N books, the number of database queries for purchase status should be at most 1, regardless of the value of N.

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

### Database Query Failures

**Scenario**: The query to check purchase status fails due to database connection issues.

**Handling**:
1. Log the error with full context (user ID, book IDs)
2. Default `purchased` to 0 for all books
3. Continue processing the request normally
4. Return successful response with default values

**Rationale**: Failing the entire request due to purchase status query failure would degrade user experience. Defaulting to 0 is safe and allows the user to continue browsing.

### Invalid User Role

**Scenario**: User role is not one of the expected values.

**Handling**:
1. Treat as non-purchasable role
2. Set `purchased` to 0 for all books
3. Log warning about unexpected role

### Missing User ID

**Scenario**: Authenticated request but user ID is missing from req.user.

**Handling**:
1. This should not happen if authentication middleware works correctly
2. If it does occur, return 401 Unauthorized error
3. Log error for investigation

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Test: User with paid order sees purchased = 1**
   - Create a user with role 'user'
   - Create a book
   - Create an order with status 'paid'
   - Call getBooks() and verify purchased = 1

2. **Test: User without order sees purchased = 0**
   - Create a user with role 'user'
   - Create a book
   - Call getBooks() and verify purchased = 0

3. **Test: Student always sees purchased = 0**
   - Create a user with role 'student'
   - Create a book
   - Create an order with status 'paid' (shouldn't happen in practice)
   - Call getBooks() and verify purchased = 0

4. **Test: Failed order doesn't count as purchased**
   - Create a user with role 'user'
   - Create a book
   - Create an order with status 'failed'
   - Call getBooks() and verify purchased = 0

5. **Test: Multiple books with mixed purchase status**
   - Create a user with role 'user'
   - Create 3 books
   - Create paid order for book 1
   - Create failed order for book 2
   - No order for book 3
   - Call getBooks() and verify: book1.purchased = 1, book2.purchased = 0, book3.purchased = 0

6. **Test: Database error defaults to purchased = 0**
   - Mock Order.findAll to throw error
   - Call getBooks() and verify all books have purchased = 0
   - Verify error was logged

### Property-Based Tests

Property-based tests will verify universal properties across many generated inputs:

1. **Property Test: Purchase status accuracy**
   - Generate random users with role 'user'
   - Generate random books
   - Generate random orders with various statuses
   - For each user-book pair, verify purchased field matches order status

2. **Property Test: Non-user roles always unpurchased**
   - Generate random users with roles 'student', 'super_admin', 'college_admin'
   - Generate random books
   - Generate random orders (even with 'paid' status)
   - Verify all books have purchased = 0

3. **Property Test: Query count is constant**
   - Generate varying numbers of books (1, 10, 100)
   - Track database query count
   - Verify query count is at most 1 for purchase status regardless of book count

### Integration Tests

1. **Test: End-to-end books list with purchase indicator**
   - Set up test database with users, books, and orders
   - Make authenticated API request to GET /api/books
   - Verify response includes purchased field
   - Verify purchased values are correct

2. **Test: End-to-end single book with purchase indicator**
   - Set up test database
   - Make authenticated API request to GET /api/books/:bookId
   - Verify response includes purchased field
   - Verify purchased value is correct

### Testing Framework

- **Unit Tests**: Jest with Sequelize mocking
- **Property-Based Tests**: fast-check library for JavaScript
- **Integration Tests**: Supertest for API testing with test database
- **Minimum Iterations**: 100 iterations per property test
