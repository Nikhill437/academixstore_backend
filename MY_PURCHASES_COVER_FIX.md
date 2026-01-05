# My Purchases Cover Image Fix

## Problem
The `/api/orders/my-purchases` endpoint was returning `cover_image_url` (direct S3 URL) instead of `cover_image_access_url` (signed URL), causing "Access Denied" errors on the frontend.

## Solution Applied ✅

Updated the `/my-purchases` endpoint to generate signed URLs for cover images, matching the behavior of the `/books` endpoint.

## Changes Made

### Before
```javascript
// Only PDF URLs were converted to signed URLs
// Cover images were returned as direct S3 URLs
{
  "book": {
    "cover_image_url": "https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/..."
  }
}
```

### After
```javascript
// Both PDF and cover image URLs are now signed URLs
{
  "book": {
    "pdf_access_url": "https://academixstore.s3.ap-south-1.amazonaws.com/books/pdfs/...?X-Amz-Algorithm=...",
    "cover_image_access_url": "https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/...?X-Amz-Algorithm=..."
  }
}
```

## API Response Format

The `/api/orders/my-purchases` endpoint now returns:

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
          "cover_image_access_url": "https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/...?X-Amz-Algorithm=...",
          "pdf_access_url": "https://academixstore.s3.ap-south-1.amazonaws.com/books/pdfs/...?X-Amz-Algorithm=..."
        },
        "amount": 299,
        "status": "paid",
        "purchased_at": "2024-01-15T10:30:00Z",
        "subscription": {
          "status": "active",
          "end_date": "2024-07-15T10:30:00Z",
          "is_active": true,
          "days_remaining": 180
        }
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

## Frontend Usage

Update your Flutter/frontend code to use `cover_image_access_url`:

```dart
// ✅ Correct - use the signed URL
Image.network(book['cover_image_access_url'])

// ❌ Wrong - this field no longer exists
Image.network(book['cover_image_url'])
```

## Important Notes

1. **Signed URLs expire after 1 hour** - If a user keeps the app open for more than an hour, you may need to refresh the data

2. **Consistent with /books endpoint** - Both endpoints now return the same URL format

3. **Fallback behavior** - If signed URL generation fails, the endpoint will fall back to the direct URL (which will work if you've set up the bucket policy)

4. **Logging added** - Check your backend logs for ✅ or ❌ messages to debug any URL generation issues

## Testing

After deploying this change:

1. Call the API:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://academixstore-backend.onrender.com/api/orders/my-purchases?page=1&limit=10&status=paid"
   ```

2. Check the response - you should see `cover_image_access_url` instead of `cover_image_url`

3. Copy the `cover_image_access_url` and open it in a browser - the image should display

4. Check your backend logs for the ✅ success messages

## Deploy

Commit and push these changes to trigger a deployment on Render:

```bash
git add src/routes/order.js
git commit -m "Fix: Generate signed URLs for cover images in my-purchases endpoint"
git push origin main
```

Wait for Render to deploy (usually 2-3 minutes), then test the endpoint.
