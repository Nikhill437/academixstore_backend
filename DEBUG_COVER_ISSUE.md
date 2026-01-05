# Cover Image Access Denied - Debug Guide

## Issue Found
Your local environment doesn't have AWS credentials configured, but that's okay since the issue is on production.

## The Real Problem

The "Access Denied" error means one of these things:

### 1. **Bucket Policy Not Applied** (Most Likely)
You need to add a bucket policy to make cover images public.

**Go to AWS Console and apply this:**

1. Open [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on bucket: **academixstore**
3. Go to **Permissions** tab
4. Find **Block public access (bucket settings)**
   - Click **Edit**
   - **UNCHECK** "Block all public access" (or at least uncheck "Block public access to buckets and objects granted through new public bucket or access point policies")
   - Click **Save changes**
   - Type "confirm" when prompted

5. Scroll down to **Bucket policy**
6. Click **Edit**
7. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadCoverImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::academixstore/books/covers/*"
    }
  ]
}
```

8. Click **Save changes**

### 2. **Wrong URL Format**
Check what URL your frontend is using. Get a book from your API and check the response:

```bash
# Replace with your actual API URL and token
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-api.com/api/books/BOOK_ID
```

Look for the `cover_image_access_url` field. It should look like:
```
https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/...
```

### 3. **IAM Permissions Issue**
Your IAM user needs these permissions:
- `s3:PutObject` - to upload files
- `s3:GetObject` - to generate signed URLs
- `s3:DeleteObject` - to delete old files

Check your IAM user policy includes:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::academixstore/*",
        "arn:aws:s3:::academixstore"
      ]
    }
  ]
}
```

## Quick Test

After applying the bucket policy, test directly in your browser:

1. Get a cover image URL from your API
2. Copy the URL
3. Paste it in a new browser tab
4. If you see the image → ✅ Fixed!
5. If you see "Access Denied" → Check the bucket policy again

## Alternative: Use Signed URLs (More Complex)

If you want to keep images private, the backend already generates signed URLs. But you need to:

1. Ensure your IAM user has `s3:GetObject` permission
2. Make sure your frontend uses `cover_image_access_url` from the API response
3. Handle URL expiration (they expire after 1 hour)

**For book covers, public access is recommended** because:
- Book covers are typically public content
- No expiration issues
- Simpler implementation
- Better performance

## Still Not Working?

Share these details:
1. A sample cover image URL from your API response
2. Your backend logs when fetching a book (look for the ✅ or ❌ messages)
3. Screenshot of your S3 bucket permissions page
