# Fix S3 Cover Image Access - Step by Step

## ⚠️ IMPORTANT: You Must Do BOTH Steps

Many people add the bucket policy but forget to unblock public access. You need BOTH!

---

## Step 1: Unblock Public Access (REQUIRED!)

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on your bucket: **academixstore**
3. Click the **Permissions** tab
4. Find **Block public access (bucket settings)** section
5. Click **Edit** button
6. **UNCHECK** this option:
   - ☐ Block public access to buckets and objects granted through new public bucket or access point policies
   
   OR uncheck all 4 options if you want (for simplicity):
   - ☐ Block all public access
   
7. Click **Save changes**
8. Type **confirm** in the dialog box
9. Click **Confirm**

**Why?** Even with a bucket policy, if public access is blocked at the bucket level, it won't work!

---

## Step 2: Add Bucket Policy

1. Still in the **Permissions** tab
2. Scroll down to **Bucket policy** section
3. Click **Edit**
4. **If there's already a policy**, add the new statement to the existing policy
5. **If it's empty**, paste this entire policy:

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

6. Click **Save changes**

---

## Step 3: Test It

### Option A: Test with an existing cover image

1. Go to your S3 bucket
2. Navigate to: **books** → **covers**
3. Click on any image file
4. Copy the **Object URL** (should look like: `https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/...`)
5. Open that URL in a new browser tab
6. **Expected result:** You should see the image
7. **If you see "Access Denied":** Go back and check Step 1 - public access is still blocked

### Option B: Test with your API

1. Call your API to get a book:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-api-url.com/api/books/BOOK_ID
   ```

2. Look for `cover_image_access_url` in the response

3. Copy that URL and open it in a browser

4. You should see the image

---

## Common Mistakes

❌ **Only adding the bucket policy** → Won't work if public access is blocked
❌ **Wrong bucket name in policy** → Make sure it says `academixstore`
❌ **Wrong path in policy** → Make sure it says `books/covers/*`
❌ **Typo in the policy** → Copy-paste exactly as shown above

---

## Visual Checklist

After completing both steps, your S3 bucket should show:

**Block public access (bucket settings):**
```
Off (or partially off)
```

**Bucket policy:**
```
✅ Policy exists
✅ Contains "books/covers/*"
✅ Action is "s3:GetObject"
✅ Principal is "*"
```

---

## Still Getting Access Denied?

If you've done both steps and still see "Access Denied":

1. **Wait 1-2 minutes** - AWS changes can take a moment to propagate

2. **Check the URL format** - Should be:
   ```
   https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/FILENAME
   ```

3. **Verify the file exists** - Go to S3 console and check the file is actually there

4. **Check your IAM user** - Make sure it has `s3:PutObject` permission to upload files

5. **Try uploading a new cover image** - Old images might have been uploaded with wrong permissions

---

## Need More Help?

Share:
1. Screenshot of your "Block public access" settings
2. Screenshot of your bucket policy
3. A sample cover image URL that's not working
4. Any error messages from your backend logs
