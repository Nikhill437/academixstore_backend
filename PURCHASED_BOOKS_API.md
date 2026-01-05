# Purchased Books API - Implementation Summary

## Overview
Implemented a new API endpoint to retrieve books purchased by users with the 'user' role. This endpoint is **NOT available for students** as they have free access to their college books.

---

## New API Endpoint

### Get My Purchased Books
```
GET /api/orders/my-purchases
```

**Authentication:** Required (JWT Token)

**Authorization:** Only users with role `user` (individual users)

**Query Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 10
- `status` (optional): Filter by order status, default: 'paid'
  - Options: 'created', 'pending', 'paid', 'failed', 'refunded'

---

## Request Example

```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases?page=1&limit=10&status=paid" \
  -H "Authorization: Bearer your-jwt-token"
```

---

## Response Example

```json
{
  "success": true,
  "data": {
    "purchases": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "book": {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Data Structures and Algorithms",
          "authorname": "Thomas H. Cormen",
          "description": "Comprehensive guide to DSA",
          "category": "Computer Science",
          "subject": "Programming",
          "language": "English",
          "year": 2024,
          "semester": 3,
          "pages": 1312,
          "rating": 4.5,
          "pdf_access_url": "https://your-bucket.s3.amazonaws.com/books/pdfs/uuid/file.pdf?X-Amz-Algorithm=...",
          "cover_image_url": "https://your-bucket.s3.amazonaws.com/books/covers/uuid/cover.jpg"
        },
        "amount": 499.00,
        "currency": "INR",
        "status": "paid",
        "payment_method": "card",
        "purchased_at": "2024-12-31T10:30:00Z",
        "razorpay_order_id": "order_MNqzT8xKvLjP9o",
        "razorpay_payment_id": "pay_MNqzT8xKvLjP9p"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

## Key Features

### 1. Role-Based Access Control
- ✅ **Only 'user' role** can access this endpoint
- ❌ **Students cannot access** (they get free college books)
- ❌ **Admins cannot access** (use different endpoints)

### 2. Secure PDF Access
- PDF URLs are **signed with 1-hour expiry**
- Direct PDF URLs are removed from response for security
- Users get temporary access URLs via AWS S3 signed URLs

### 3. Pagination Support
- Default: 10 items per page
- Customizable via query parameters
- Returns total count and page information

### 4. Order Status Filtering
- Filter by payment status: 'paid', 'pending', 'failed', etc.
- Default shows only 'paid' orders
- Useful for showing purchase history

### 5. Sorted by Purchase Date
- Most recent purchases appear first
- Orders sorted by `paid_at` then `created_at`

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "AUTH_REQUIRED"
}
```

### 403 Forbidden (Wrong Role)
```json
{
  "success": false,
  "message": "Access denied. Required roles: user",
  "error": "ACCESS_DENIED"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve purchased books",
  "error": "PURCHASES_FETCH_FAILED"
}
```

---

## Implementation Details

### Files Modified

1. **src/routes/order.js**
   - Added new GET endpoint `/my-purchases`
   - Implemented role-based access control
   - Added signed URL generation for PDFs
   - Implemented pagination and filtering

2. **API_DOCUMENTATION.md**
   - Added complete documentation for the new endpoint
   - Updated role-based access summary
   - Added request/response examples

### Database Queries

The endpoint performs the following:
1. Fetches orders for the authenticated user
2. Joins with Book table to get book details
3. Filters by order status (default: 'paid')
4. Applies pagination
5. Generates signed URLs for PDF access
6. Removes direct PDF URLs for security

### Security Measures

- ✅ JWT authentication required
- ✅ Role-based authorization (user only)
- ✅ Signed URLs with 1-hour expiry
- ✅ Direct PDF URLs removed from response
- ✅ User can only see their own purchases

---

## Testing the Endpoint

### Step 1: Login as User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Step 2: Get Purchased Books
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 3: Filter by Status
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases?status=paid&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Integration with Frontend

### React/Vue Example
```javascript
const fetchPurchasedBooks = async (page = 1, limit = 10) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/orders/my-purchases?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.purchases;
    }
  } catch (error) {
    console.error('Failed to fetch purchased books:', error);
  }
};
```

---

## Notes

1. **Students vs Users:**
   - Students get free access to their college books
   - Individual users must purchase books
   - This endpoint is only for individual users who purchase books

2. **PDF Access:**
   - Signed URLs expire after 1 hour
   - Frontend should refresh URLs when needed
   - Use the `/api/books/:bookId/refresh-pdf-url` endpoint to get new URLs

3. **Payment Flow:**
   - User creates order → `/api/orders/create`
   - User completes payment via Razorpay
   - User verifies payment → `/api/orders/verify-payment`
   - User can now access purchased book → `/api/orders/my-purchases`

---

## Future Enhancements

- [ ] Add download history tracking
- [ ] Add ability to re-download purchased books
- [ ] Add purchase receipt generation
- [ ] Add refund request functionality
- [ ] Add purchase analytics for users
