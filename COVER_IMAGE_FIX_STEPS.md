# Cover Image Access Denied - Quick Fix Guide

## The Problem
Your frontend is getting "Access Denied" when trying to display book cover images because the S3 bucket doesn't allow public access to the cover images.

## Quick Fix (5 minutes)

### Step 1: Add S3 Bucket Policy
1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on your bucket (the one in your `AWS_S3_BUCKET` env variable)
3. Go to the **Permissions** tab
4. Scroll down to **Bucket policy**
5. Click **Edit**
6. Add this policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

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

7. Click **Save changes**

### Step 2: Update Your Frontend
Make sure your frontend uses the direct S3 URL for cover images:

```javascript
// The API returns this structure:
{
  "book": {
    "id": "...",
    "name": "Book Title",
    "cover_image_access_url": "https://bucket.s3.region.amazonaws.com/books/covers/..."
  }
}

// Use it like this:
<img src={book.cover_image_access_url} alt={book.name} />
```

### Step 3: Test
After applying the bucket policy, test by opening a cover image URL directly in your browser. It should display the image instead of showing "Access Denied".

## Why This Works
- The bucket policy allows **public read access** to all files in the `books/covers/` folder
- PDFs remain private (they're in `books/pdfs/` folder)
- No code changes needed on the backend
- Cover images work immediately without signed URLs

## Alternative: Keep Using Signed URLs
If you prefer to keep cover images private and use signed URLs:

1. **Backend is already configured** - signed URLs are generated in `_addFileUrlsToBook()`
2. **Frontend must use** `cover_image_access_url` from API response
3. **Note:** URLs expire after 1 hour, so you'll need to refresh them

But for book covers, public access is the standard approach and much simpler.

## Debugging
If it still doesn't work after adding the bucket policy:

1. Check the bucket policy was saved correctly
2. Verify the bucket name in the policy matches your actual bucket
3. Check your backend logs for any errors when generating URLs
4. Test the URL directly in a browser or with curl:
   ```bash
   curl -I https://YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com/books/covers/YOUR-IMAGE.jpg
   ```

## Need Help?
If you're still having issues, share:
1. Your bucket name (from env variables)
2. A sample cover image URL from your API response
3. Any error messages from the backend logs
