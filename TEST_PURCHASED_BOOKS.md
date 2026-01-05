# Testing Guide: Purchased Books API

## Prerequisites
- Server running on `http://localhost:3000`
- User account with role 'user' (not 'student')
- At least one purchased book (completed payment)

---

## Test Scenarios

### ✅ Test 1: Successful Request (User Role)

**Step 1: Login as User**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Step 2: Get Purchased Books**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "purchases": [
      {
        "id": "order-uuid",
        "book": {
          "id": "book-uuid",
          "name": "Book Title",
          "authorname": "Author Name",
          "pdf_access_url": "https://signed-url...",
          "cover_image_url": "https://..."
        },
        "amount": 499.00,
        "currency": "INR",
        "status": "paid",
        "purchased_at": "2024-12-31T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### ❌ Test 2: Unauthorized (No Token)

**Request:**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "AUTH_REQUIRED"
}
```

---

### ❌ Test 3: Forbidden (Student Role)

**Step 1: Login as Student**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@college.edu",
    "password": "password123"
  }'
```

**Step 2: Try to Access Purchased Books**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Access denied. Required roles: user",
  "error": "ACCESS_DENIED"
}
```

---

### ✅ Test 4: Pagination

**Request:**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "purchases": [...],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 5,
      "totalPages": 3
    }
  }
}
```

---

### ✅ Test 5: Filter by Status

**Request (Show only paid orders):**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases?status=paid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Request (Show failed orders):**
```bash
curl -X GET "http://localhost:3000/api/orders/my-purchases?status=failed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Using Postman

### Setup
1. Create a new collection: "Book Purchase API"
2. Add environment variables:
   - `base_url`: `http://localhost:3000`
   - `token`: (will be set after login)

### Test 1: Login
- **Method:** POST
- **URL:** `{{base_url}}/api/auth/login`
- **Body (JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Tests Script:**
  ```javascript
  pm.test("Login successful", function () {
      pm.response.to.have.status(200);
      var jsonData = pm.response.json();
      pm.environment.set("token", jsonData.data.token);
  });
  ```

### Test 2: Get Purchased Books
- **Method:** GET
- **URL:** `{{base_url}}/api/orders/my-purchases`
- **Headers:**
  - `Authorization`: `Bearer {{token}}`
- **Tests Script:**
  ```javascript
  pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
  });
  
  pm.test("Response has purchases array", function () {
      var jsonData = pm.response.json();
      pm.expect(jsonData.data).to.have.property('purchases');
      pm.expect(jsonData.data.purchases).to.be.an('array');
  });
  
  pm.test("Response has pagination", function () {
      var jsonData = pm.response.json();
      pm.expect(jsonData.data).to.have.property('pagination');
  });
  ```

---

## Database Verification

### Check Orders Table
```sql
SELECT 
  o.id,
  o.user_id,
  o.book_id,
  o.status,
  o.amount,
  o.paid_at,
  u.email as user_email,
  b.name as book_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN books b ON o.book_id = b.id
WHERE u.role = 'user'
ORDER BY o.paid_at DESC;
```

### Check User Role
```sql
SELECT id, email, role, full_name
FROM users
WHERE email = 'user@example.com';
```

---

## Common Issues & Solutions

### Issue 1: "Access denied. Required roles: user"
**Cause:** User has 'student' role instead of 'user' role
**Solution:** Login with a user account that has role 'user'

### Issue 2: Empty purchases array
**Cause:** User hasn't purchased any books yet
**Solution:** 
1. Create an order: `POST /api/orders/create`
2. Complete payment: `POST /api/orders/verify-payment`
3. Then check purchases

### Issue 3: "Failed to generate signed URL"
**Cause:** AWS S3 credentials not configured
**Solution:** Check `.env` file has:
```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
```

### Issue 4: PDF URL expired
**Cause:** Signed URLs expire after 1 hour
**Solution:** Refresh the page or call the API again to get new signed URLs

---

## Success Criteria

✅ User with 'user' role can access the endpoint
✅ Student with 'student' role gets 403 Forbidden
✅ Response includes book details with signed PDF URLs
✅ Pagination works correctly
✅ Status filtering works correctly
✅ Orders are sorted by purchase date (newest first)
✅ Direct PDF URLs are removed from response
✅ Signed URLs are valid for 1 hour

---

## Next Steps

After successful testing:
1. Integrate with frontend application
2. Add error handling in UI
3. Implement PDF URL refresh mechanism
4. Add download tracking
5. Add purchase receipt generation
