# AWS S3 Setup Guide for Educational Book Subscription System

This guide will help you set up AWS S3 for storing book PDFs, cover images, and advertisement images in your educational book subscription system.

## 📋 Table of Contents

1. [AWS S3 Bucket Setup](#aws-s3-bucket-setup)
2. [IAM User and Permissions](#iam-user-and-permissions)
3. [Environment Configuration](#environment-configuration)
4. [Local Development Setup](#local-development-setup)
5. [File Upload API Endpoints](#file-upload-api-endpoints)
6. [Testing S3 Integration](#testing-s3-integration)
7. [Production Considerations](#production-considerations)

---

## 🪣 AWS S3 Bucket Setup

### Step 1: Create S3 Bucket

1. **Login to AWS Console**: Go to [AWS Console](https://console.aws.amazon.com/)
2. **Navigate to S3**: Search for "S3" in the AWS services
3. **Create Bucket**: Click "Create bucket"

#### Bucket Configuration:
```
Bucket name: your-educational-books-bucket
Region: us-east-1 (or your preferred region)
Block all public access: UNCHECK (we need some files to be publicly accessible)
Bucket Versioning: Enable (recommended)
Default encryption: Enable with SSE-S3
```

### Step 2: Configure Bucket Policy

Create a bucket policy to allow public read access to cover images and advertisements:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": [
                "arn:aws:s3:::your-educational-books-bucket/books/covers/*",
                "arn:aws:s3:::your-educational-books-bucket/ads/images/*"
            ]
        }
    ]
}
```

### Step 3: Set Up CORS Configuration

Configure CORS to allow web application access:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://your-domain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

---

## 👤 IAM User and Permissions

### Step 1: Create IAM User

1. Go to **IAM** service in AWS Console
2. Click **Users** → **Add user**
3. User name: `educational-book-app`
4. Select **Programmatic access**

### Step 2: Create Custom IAM Policy

Create a policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-educational-books-bucket/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:HeadBucket"
            ],
            "Resource": "arn:aws:s3:::your-educational-books-bucket"
        }
    ]
}
```

### Step 3: Get Access Keys

After creating the user:
1. Note down the **Access Key ID**
2. Note down the **Secret Access Key**
3. Store them securely (you won't be able to retrieve the secret key again)

---

## ⚙️ Environment Configuration

### Update your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA1234567890EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-educational-books-bucket

# Optional: CloudFront CDN (recommended for production)
AWS_CLOUDFRONT_DOMAIN=d123456789.cloudfront.net
```

### Validate Configuration

Test your S3 connection:

```bash
# Run this endpoint to test S3 connection
curl -X GET http://localhost:3000/api/books/test-s3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ Local Development Setup

### Option 1: Use Real AWS S3
- Follow the steps above
- Use your actual AWS credentials
- Recommended for production-like testing

### Option 2: Use LocalStack (S3 Emulator)

Install LocalStack for local S3 development:

```bash
# Install LocalStack
pip install localstack
# OR using Docker
docker run -d -p 4566:4566 -p 4571:4571 localstack/localstack
```

Configure for LocalStack:
```env
# LocalStack S3 Configuration
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
AWS_S3_BUCKET=local-books-bucket
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
```

Create bucket in LocalStack:
```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://local-books-bucket
```

---

## 🚀 File Upload API Endpoints

### Book PDF Upload
```http
POST /api/books/:bookId/upload-pdf
Content-Type: multipart/form-data
Authorization: Bearer <admin-or-super-admin-token>

Form Data:
- book: <PDF file>
```

Example using curl:
```bash
curl -X POST http://localhost:3000/api/books/book-id-here/upload-pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "book=@/path/to/book.pdf"
```

### Book Cover Upload
```http
POST /api/books/:bookId/upload-cover
Content-Type: multipart/form-data
Authorization: Bearer <admin-or-super-admin-token>

Form Data:
- cover: <Image file>
```

### Upload Both Files
```http
POST /api/books/:bookId/upload-both
Content-Type: multipart/form-data
Authorization: Bearer <admin-or-super-admin-token>

Form Data:
- book: <PDF file>
- cover: <Image file>
```

### File Constraints
- **PDF Files**: Max 100MB, only `.pdf` format
- **Cover Images**: Max 5MB, formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- **Advertisement Images**: Max 2MB, same image formats

---

## 🧪 Testing S3 Integration

### 1. Test S3 Connection

Create a test endpoint in your controller:

```javascript
// Add this to bookController.js for testing
async testS3Connection(req, res) {
  try {
    const { testS3Connection } = await import('../config/aws.js');
    await testS3Connection();
    
    return res.json({
      success: true,
      message: 'S3 connection successful',
      bucket: process.env.AWS_S3_BUCKET
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'S3 connection failed',
      error: error.message
    });
  }
}
```

### 2. Upload Test File

```bash
# Create a test book first
curl -X POST http://localhost:3000/api/books \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "college_year": "first_year",
    "category": "textbook"
  }'

# Upload PDF to the created book
curl -X POST http://localhost:3000/api/books/BOOK_ID/upload-pdf \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "book=@test-book.pdf"
```

### 3. Verify File Access

Check if the uploaded file is accessible:
- PDF files should generate signed URLs for secure access
- Cover images should be publicly accessible
- URLs should be stored in the database

---

## 🔐 Production Considerations

### 1. Security

**Bucket Policies:**
- Never make PDF files publicly readable
- Only cover images and advertisements should be public
- Use signed URLs for PDF access

**Access Controls:**
- Use IAM roles instead of access keys in production
- Rotate access keys regularly
- Enable CloudTrail for audit logging

### 2. Performance

**CloudFront CDN:**
```env
AWS_CLOUDFRONT_DOMAIN=d123456789.cloudfront.net
```
- Distribute cover images globally
- Reduce load on S3
- Improve user experience

**File Optimization:**
- Compress PDFs before upload
- Optimize cover images (WebP format)
- Implement file size limits

### 3. Costs

**S3 Storage Classes:**
- Use Standard for frequently accessed files
- Use Standard-IA for older books
- Use Glacier for archival

**Lifecycle Policies:**
```json
{
    "Rules": [
        {
            "Id": "BookLifecycle",
            "Status": "Enabled",
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 365,
                    "StorageClass": "GLACIER"
                }
            ]
        }
    ]
}
```

### 4. Monitoring

Set up CloudWatch alarms for:
- S3 bucket size
- Upload/download metrics
- Error rates
- Costs

### 5. Backup

- Enable Cross-Region Replication
- Set up versioning
- Regular backup policies

---

## 🐛 Troubleshooting

### Common Issues:

1. **Access Denied Error:**
   - Check IAM permissions
   - Verify bucket policy
   - Ensure correct region

2. **File Too Large:**
   - Check file size limits in middleware
   - Verify S3 multipart upload settings

3. **CORS Errors:**
   - Update CORS configuration
   - Check allowed origins

4. **SignedURL Issues:**
   - Verify AWS credentials
   - Check expiration times
   - Ensure correct bucket/key

### Debug Commands:

```bash
# Check S3 connection
aws s3 ls s3://your-bucket-name --region us-east-1

# Test file upload
aws s3 cp test-file.pdf s3://your-bucket-name/test/

# Generate signed URL
aws s3 presign s3://your-bucket-name/path/to/file --expires-in 3600
```

---

## 📚 Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [LocalStack Documentation](https://docs.localstack.cloud/)

---

Your AWS S3 integration is now complete! The system will automatically:
- Store book PDFs securely with signed URL access
- Store cover images with public access
- Handle file uploads with proper validation
- Manage file deletions when books are removed
- Provide role-based access to files