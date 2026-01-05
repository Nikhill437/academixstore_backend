# S3 Cover Image Access Fix

## Problem
Cover images are returning "Access Denied" error when accessed from the frontend because they're not publicly accessible.

## Root Cause
- Cover images are uploaded to S3 without public access permissions
- The bucket doesn't allow ACLs, so we can't set individual file permissions
- Signed URLs should work, but the frontend might be using direct S3 URLs

## Solution Options

### Option 1: Make Cover Images Public (Recommended)
Add a bucket policy to make cover images publicly readable:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadCoverImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/books/covers/*"
    }
  ]
}
```

**Steps:**
1. Go to AWS S3 Console
2. Select your bucket
3. Go to "Permissions" tab
4. Scroll to "Bucket policy"
5. Click "Edit"
6. Add the policy above (replace YOUR-BUCKET-NAME with your actual bucket name)
7. Save changes

**Pros:**
- Cover images work immediately without signed URLs
- No URL expiration issues
- Simpler frontend implementation
- Better performance (no signed URL generation)

**Cons:**
- Cover images are publicly accessible (but this is usually fine for book covers)

### Option 2: Use Signed URLs (Current Approach)
Keep using signed URLs but ensure the frontend uses the `cover_image_access_url` field from the API response, not the direct S3 URL.

**Frontend must use:**
```javascript
// ✅ Correct - use the signed URL
book.cover_image_access_url

// ❌ Wrong - don't use direct S3 URL
book.cover_image_url
```

**Pros:**
- More secure (temporary access)
- No AWS configuration changes needed

**Cons:**
- URLs expire after 1 hour
- Frontend must refresh URLs when they expire
- More complex implementation

## Recommended Action

**Use Option 1** (make cover images public) because:
- Book covers are typically public content anyway
- Simpler implementation
- Better user experience (no expiration issues)
- Standard practice for e-commerce/book platforms

## Testing After Fix

After applying the bucket policy, test with:
```bash
curl -I https://YOUR-BUCKET-NAME.s3.YOUR-REGION.amazonaws.com/books/covers/YOUR-IMAGE.jpg
```

Should return `200 OK` instead of `403 Forbidden`.
