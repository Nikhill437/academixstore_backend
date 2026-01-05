# Design Document: Role-Based Book Filtering

## Overview

This design implements role-based book filtering logic in the existing library management system. The current implementation filters books primarily by college association, but lacks year-based filtering for students. This enhancement ensures students only see books relevant to their academic year, while maintaining appropriate access levels for other user roles (user, college_admin, super_admin).

The implementation modifies the existing `BookController.getBooks()` and `BookController.getBook()` methods, as well as the `Book.isAccessibleBy()` instance method, to apply role-specific filtering rules.

## Architecture

### Current System

The system uses:
- **Express.js** backend with Sequelize ORM
- **PostgreSQL** database
- **JWT-based authentication** with role information in `req.user`
- **Role-based access control (RBAC)** middleware

### Key Components

1. **BookController** (`src/controllers/bookController.js`)
   - `getBooks()`: Returns filtered list of books based on user role
   - `getBook()`: Returns single book with access control
   - `isAccessibleBy()`: Instance method checking book access permissions

2. **Book Model** (`src/models/Book.js`)
   - Contains `year` field (STRING) representing academic year
   - Contains `college_id` field (UUID) for college association
   - Contains `isAccessibleBy()` instance method for access control

3. **User Model** (`src/models/User.js`)
   - Contains `role` field (ENUM: 'super_admin', 'college_admin', 'student', 'user')
   - Contains `year` field (STRING) for student academic year
   - Contains `college_id` field (UUID) for college association

## Components and Interfaces

### Modified Methods

#### 1. BookController.getBooks()

**Current Behavior:**
- Filters by `college_id` for college_admin and student roles
- Returns all books for super_admin
- Returns all books for user role

**New Behavior:**
- **Student role**: Filter by both `college_id` AND `year` (user.year === book.year)
- **User role**: No filtering (all books)
- **College_admin role**: Filter by `college_id` only (no year filter)
- **Super_admin role**: No filtering (all books)

**Method Signature:**
```javascript
async getBooks(req, res)
```

**Input:**
- `req.user`: Authenticated user object with `{ id, role, collegeId, year }`
- `req.query`: Optional filters `{ category, year, semester }`

**Output:**
- JSON response with filtered book list
- HTTP 200 on success
- HTTP 400/403/500 on errors

#### 2. BookController.getBook()

**Current Behavior:**
- Uses `book.isAccessibleBy(req.user)` to check access
- Returns single book if accessible

**New Behavior:**
- Enhanced `isAccessibleBy()` method with year-based filtering for students
- Maintains existing access control for other roles

**Method Signature:**
```javascript
async getBook(req, res)
```

**Input:**
- `req.params.bookId`: UUID of requested book
- `req.user`: Authenticated user object

**Output:**
- JSON response with book data
- HTTP 404 if book not found
- HTTP 403 if access denied

#### 3. Book.isAccessibleBy()

**Current Behavior:**
```javascript
Book.prototype.isAccessibleBy = function (user) {
  if (user.role === 'super_admin') return true;
  if (!this.college_id) return true; // Global books
  if (this.college_id) {
    if (!user.college_id) return false;
    if (user.college_id !== this.college_id) return false;
    if (user.role === 'college_admin' || user.role === 'student' || user.role === 'user') {
      return true;
    }
  }
  return false;
};
```

**New Behavior:**
- Add year-based check for student role
- Maintain existing logic for other roles

**Pseudocode:**
```
function isAccessibleBy(user):
  // Super admin has full access
  if user.role == 'super_admin':
    return true
  
  // Global books (no college_id) are accessible to all
  if this.college_id is null:
    return true
  
  // College-based books require college association
  if this.college_id is not null:
    if user.college_id is null:
      return false
    
    if user.college_id != this.college_id:
      return false
    
    // Role-specific access within same college
    if user.role == 'college_admin':
      return true
    
    if user.role == 'user':
      return true
    
    if user.role == 'student':
      // NEW: Check year match for students
      if user.year is null:
        return false
      if user.year != this.year:
        return false
      return true
  
  return false
```

## Data Models

### User Model Fields (Relevant)
```javascript
{
  id: UUID,
  role: ENUM('super_admin', 'college_admin', 'student', 'user'),
  college_id: UUID | null,
  year: STRING | null  // e.g., "F.Y.M.Sc", "S.Y.B.Sc"
}
```

### Book Model Fields (Relevant)
```javascript
{
  id: UUID,
  name: STRING,
  year: STRING,  // e.g., "F.Y.M.Sc", "S.Y.B.Sc"
  semester: INTEGER,
  college_id: UUID | null,
  is_active: BOOLEAN
}
```

### Filtering Logic Matrix

| User Role      | College Filter | Year Filter | Result                                    |
|----------------|----------------|-------------|-------------------------------------------|
| student        | ✓ (own)        | ✓ (own)     | Books from own college AND own year       |
| user           | ✗              | ✗           | All active books                          |
| college_admin  | ✓ (own)        | ✗           | All books from own college (all years)    |
| super_admin    | ✗              | ✗           | All active books                          |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Student Year Filtering Consistency

*For any* student user with a defined year field and any book list query, all returned books must have a year field that exactly matches the student's year field.

**Validates: Requirements 1.1, 1.2**

### Property 2: Student College and Year Conjunction

*For any* student user with defined college_id and year fields, all returned books must satisfy both conditions: book.college_id equals user.college_id AND book.year equals user.year.

**Validates: Requirements 1.3**

### Property 3: User Role Unrestricted Access

*For any* user with role 'user', the book list query must return all active books without applying college_id or year filters.

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: Super Admin Unrestricted Access

*For any* user with role 'super_admin', the book list query must return all active books without applying any role-based filters.

**Validates: Requirements 3.1, 3.4**

### Property 5: College Admin College-Only Filtering

*For any* college_admin user with a defined college_id, all returned books must have a college_id that matches the admin's college_id, regardless of book year.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 6: Access Control Consistency

*For any* book and user combination, the result of `book.isAccessibleBy(user)` must match the filtering logic applied in `getBooks()` for that user's role.

**Validates: Requirements 1.5, 4.3, 5.5**

### Property 7: Empty Year Handling

*For any* student user with a null or undefined year field, the book list query must return an empty array.

**Validates: Requirements 1.4, 5.2**

### Property 8: Query Parameter Preservation

*For any* user and any set of query parameters (category, semester), the role-based filtering must be applied in conjunction with (not instead of) the query parameter filters.

**Validates: Requirements 5.3**

## Error Handling

### Error Scenarios

1. **Student with no year field**
   - Return empty book list
   - Include message: "No year information available for student account"
   - HTTP 200 with empty data array

2. **Student accessing book from different year**
   - Return HTTP 403 Forbidden
   - Message: "Access denied to this book"
   - Error code: "ACCESS_DENIED"

3. **College admin accessing book from different college**
   - Return HTTP 403 Forbidden (existing behavior)
   - Message: "Access denied to this book"
   - Error code: "ACCESS_DENIED"

4. **Database query failure**
   - Return HTTP 500 Internal Server Error (existing behavior)
   - Message: "Failed to retrieve books"
   - Error code: "SERVER_ERROR"

### Error Response Format

```javascript
{
  success: false,
  message: "Human-readable error message",
  error: "ERROR_CODE",
  data: {
    books: [],
    count: 0,
    reason: "Optional detailed reason"
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Student year filtering**
   - Student with year "F.Y.M.Sc" sees only "F.Y.M.Sc" books
   - Student with year "S.Y.B.Sc" sees only "S.Y.B.Sc" books
   - Student with null year sees empty list

2. **Role-based access**
   - User role sees all books
   - Super admin sees all books
   - College admin sees only their college's books (all years)

3. **Edge cases**
   - Student with no college_id (should fail validation)
   - Books with null college_id (global books)
   - Query parameters combined with role filters

4. **isAccessibleBy() method**
   - Student accessing same-year book: true
   - Student accessing different-year book: false
   - User accessing any book: true
   - College admin accessing own college book: true

### Property-Based Tests

Property-based tests will verify universal properties across randomized inputs:

1. **Year filtering property** (Property 1)
   - Generate random student users with various year values
   - Generate random book collections with various year values
   - Verify all returned books match student's year

2. **Role access property** (Properties 3, 4)
   - Generate random users with 'user' and 'super_admin' roles
   - Generate random book collections
   - Verify no filtering is applied (all active books returned)

3. **College admin filtering property** (Property 5)
   - Generate random college_admin users with various college_ids
   - Generate random book collections with various college_ids and years
   - Verify all returned books match admin's college_id
   - Verify books from all years are included

4. **Access control consistency property** (Property 6)
   - Generate random user-book pairs
   - Verify `isAccessibleBy()` result matches filtering behavior

### Test Configuration

- **Framework**: Jest (already configured in project)
- **Property testing library**: fast-check (to be installed)
- **Minimum iterations**: 100 per property test
- **Test location**: `src/controllers/__tests__/bookController.roleFiltering.test.js`
- **Property test tags**: Each test will include a comment with format:
  ```javascript
  // Feature: role-based-book-filtering, Property 1: Student Year Filtering Consistency
  ```

### Integration Tests

Integration tests will verify end-to-end behavior:

1. **API endpoint tests**
   - GET /api/books with different authenticated users
   - GET /api/books/:id with access control checks
   - Verify response formats and status codes

2. **Database integration**
   - Verify Sequelize queries generate correct SQL
   - Verify indexes are used efficiently
   - Test with realistic data volumes

## Implementation Notes

### Backward Compatibility

- Existing API response formats remain unchanged
- Existing query parameters (category, semester) continue to work
- No database schema changes required
- Existing authentication and RBAC middleware unchanged

### Performance Considerations

- Year filtering adds one additional WHERE clause to existing queries
- Existing indexes on `books.college_id` and `books.year` will be utilized
- No N+1 query issues introduced
- Response times should remain under 200ms for typical queries

### Security Considerations

- Year field is trusted from authenticated user token (already validated)
- No user input directly used in year filtering (prevents injection)
- Access control enforced at both list and individual book levels
- Maintains principle of least privilege (students see only relevant books)

### Future Enhancements

- Consider adding semester-based filtering for students
- Add analytics for book access patterns by year
- Implement caching for frequently accessed book lists
- Add admin dashboard to visualize book distribution by year
