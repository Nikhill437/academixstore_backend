# AWS S3 Bucket Setup Requirements
## Educational Book Subscription System

This document outlines everything you need to set up AWS S3 for your book storage system.

---

## 📋 S3 Setup Requirements Checklist

### ✅ **Prerequisites**
- [ ] AWS Account (free tier available)
- [ ] Credit card for AWS verification (even for free tier)
- [ ] Access to AWS Console
- [ ] Understanding of basic AWS concepts

### ✅ **Required AWS Resources**
- [ ] S3 Bucket for file storage
- [ ] IAM User for programmatic access
- [ ] IAM Policy with correct permissions
- [ ] Access Keys (Access Key ID + Secret)

---

## 🪣 **STEP 1: Create AWS S3 Bucket**

### **1.1 Login to AWS Console**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in with your AWS account
3. Search for "S3" in the services

### **1.2 Create New Bucket**
1. Click **"Create bucket"**
2. Fill in the following details:

#### **Basic Configuration:**
```
Bucket name: educational-books-storage-[your-name]
             (must be globally unique)

Region: us-east-1 (or closest to your users)

Bucket Versioning: Enable (recommended for file recovery)
```

#### **Public Access Settings:**
```
❌ UNCHECK "Block all public access"

Specifically uncheck:
- ❌ Block public access to buckets and objects granted through new access control lists (ACLs)
- ❌ Block public access to buckets and objects granted through any access control lists (ACLs)

Keep checked:
- ✅ Block public access to buckets and objects granted through new public bucket or access point policies
- ✅ Block public and cross-account access to buckets and objects through any public bucket or access point policies
```

#### **Bucket Encryption:**
```
Default encryption: Enable
Encryption type: Server-side encryption with Amazon S3 managed keys (SSE-S3)
```

### **1.3 Configure Bucket Policy**
After creating the bucket, add this policy for public read access to cover images:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadCoverImages",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME/books/covers/*",
                "arn:aws:s3:::YOUR-BUCKET-NAME/ads/images/*"
            ]
        }
    ]
}
```

**Replace `YOUR-BUCKET-NAME` with your actual bucket name**

### **1.4 Configure CORS Policy**
Add CORS configuration for web application access:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

---

## 👤 **STEP 2: Create IAM User and Permissions**

### **2.1 Create IAM User**
1. Go to **IAM** service in AWS Console
2. Click **Users** → **Create user**
3. Configure:
   ```
   User name: educational-book-app-user
   Access type: ✅ Programmatic access
   ```

### **2.2 Create Custom IAM Policy**
1. In IAM, go to **Policies** → **Create policy**
2. Choose **JSON** tab
3. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3BucketPermissions",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:GetBucketVersioning"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        },
        {
            "Sid": "S3ObjectPermissions",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl",
                "s3:GetObjectAcl"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

4. Name the policy: `EducationalBookAppS3Policy`
5. Save the policy

### **2.3 Attach Policy to User**
1. Go back to your user
2. Click **Add permissions** → **Attach existing policies directly**
3. Search and select: `EducationalBookAppS3Policy`
4. Click **Add permissions**

### **2.4 Generate Access Keys**
1. Go to your user's **Security credentials** tab
2. Click **Create access key**
3. Select **Application running outside AWS**
4. **IMPORTANT**: Copy and save:
   - ✅ Access Key ID
   - ✅ Secret Access Key
   - ⚠️ You won't be able to see the secret key again!

---

## ⚙️ **STEP 3: Configure Your Application**

### **3.1 Update Your .env File**
Open your `.env` file and update these values:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA1234567890EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=educational-books-storage-yourname
```

### **3.2 Optional: CloudFront CDN**
For better performance (recommended for production):

```env
AWS_CLOUDFRONT_DOMAIN=d123456789abcdef.cloudfront.net
```

### **3.3 Environment Variables Breakdown**

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AWS_ACCESS_KEY_ID` | Your IAM user's access key | ✅ Yes | `AKIA1234567890EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user's secret key | ✅ Yes | `wJalrX...` |
| `AWS_REGION` | AWS region where bucket exists | ✅ Yes | `us-east-1` |
| `AWS_S3_BUCKET` | Your S3 bucket name | ✅ Yes | `educational-books-storage` |
| `AWS_S3_ENDPOINT` | Custom endpoint (LocalStack/MinIO) | ❌ No | `http://localhost:4566` |
| `AWS_S3_FORCE_PATH_STYLE` | Path-style URLs (for LocalStack) | ❌ No | `true` |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront CDN domain | ❌ No | `d123...cloudfront.net` |

---

## 🧪 **STEP 4: Test Your S3 Setup**

### **4.1 Test AWS CLI (Optional)**
If you have AWS CLI installed:

```powershell
# Configure AWS CLI
aws configure
# Enter your access key, secret key, region, and output format

# Test bucket access
aws s3 ls s3://your-bucket-name

# Test file upload
echo "test content" > test.txt
aws s3 cp test.txt s3://your-bucket-name/test.txt

# Test file download
aws s3 cp s3://your-bucket-name/test.txt downloaded-test.txt

# Clean up test file
aws s3 rm s3://your-bucket-name/test.txt
del test.txt downloaded-test.txt
```

### **4.2 Test with Your Application**
Once your backend is running, test with:

```powershell
# Create a test book first (requires authentication)
curl -X POST http://localhost:3000/api/books `
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "title": "Test Book",
    "author": "Test Author",
    "college_year": "first_year",
    "category": "textbook"
  }'

# Upload a test file
curl -X POST http://localhost:3000/api/books/BOOK_ID/upload-pdf `
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" `
  -F "book=@C:\path\to\test.pdf"
```

---

## 💰 **STEP 5: Cost Management**

### **5.1 Free Tier Limits**
AWS S3 Free Tier includes:
- ✅ 5 GB of standard storage
- ✅ 20,000 GET requests
- ✅ 2,000 PUT requests
- ✅ 15 GB of data transfer out

### **5.2 Expected Costs (Beyond Free Tier)**
For educational book storage:

| Resource | Cost Estimate |
|----------|---------------|
| Storage (per GB/month) | $0.023 |
| PUT requests (per 1,000) | $0.005 |
| GET requests (per 1,000) | $0.0004 |
| Data transfer out (per GB) | $0.09 |

**Example**: 50 books × 10MB each = 500MB = **~$0.01/month**

### **5.3 Cost Optimization Tips**
1. **Lifecycle Policies**: Move old books to cheaper storage classes
2. **CloudFront**: Reduce data transfer costs
3. **Compression**: Compress PDFs before upload
4. **Monitoring**: Set up billing alerts

---

## 🔒 **STEP 6: Security Best Practices**

### **6.1 Access Key Security**
- ❌ Never commit access keys to code repository
- ✅ Use environment variables only
- ✅ Rotate access keys regularly (every 90 days)
- ✅ Use IAM roles in production (instead of access keys)

### **6.2 Bucket Security**
- ✅ Only make cover images publicly readable
- ❌ Never make PDF files public
- ✅ Use signed URLs for PDF access
- ✅ Enable bucket logging for audit trails

### **6.3 Network Security**
- ✅ Use HTTPS only for all S3 requests
- ✅ Configure proper CORS policies
- ✅ Restrict access by IP if possible

---

## 🚀 **STEP 7: Production Considerations**

### **7.1 Performance Optimization**
1. **CloudFront CDN Setup**:
   ```
   - Create CloudFront distribution
   - Point origin to your S3 bucket
   - Configure cache behaviors
   - Update your .env with CloudFront domain
   ```

2. **Multipart Uploads**:
   - Automatically handled for files > 5MB
   - Improves upload reliability
   - Already configured in your code

### **7.2 Backup and Versioning**
1. **Enable Versioning**: Already recommended above
2. **Cross-Region Replication**: For disaster recovery
3. **Lifecycle Policies**: Archive old versions

### **7.3 Monitoring and Alerting**
1. **CloudWatch Metrics**: Monitor bucket usage
2. **Cost Alerts**: Set up billing notifications  
3. **Access Logging**: Track all bucket access

---

## 🐛 **Common Issues and Troubleshooting**

### **Issue 1: Access Denied Error**
```
Error: Access Denied
```
**Solutions**:
- ✅ Check IAM policy permissions
- ✅ Verify bucket name in policy matches actual bucket
- ✅ Ensure access keys are correct
- ✅ Check bucket policy doesn't conflict

### **Issue 2: Bucket Not Found**
```
Error: The specified bucket does not exist
```
**Solutions**:
- ✅ Verify bucket name in .env file
- ✅ Check AWS region matches bucket region
- ✅ Ensure bucket was created successfully

### **Issue 3: CORS Error**
```
Error: CORS policy blocks request
```
**Solutions**:
- ✅ Add your domain to CORS allowed origins
- ✅ Include necessary headers in CORS config
- ✅ Check request method is allowed

### **Issue 4: File Too Large**
```
Error: File size exceeds limit
```
**Solutions**:
- ✅ Check multer configuration in your code
- ✅ Verify AWS S3 multipart upload settings
- ✅ Increase limits if necessary

### **Issue 5: Signed URL Issues**
```
Error: SignedURL expired or invalid
```
**Solutions**:
- ✅ Check AWS credentials are valid
- ✅ Verify system clock is synchronized
- ✅ Ensure correct bucket and key in URL generation

---

## ✅ **Final Checklist**

Before considering your S3 setup complete:

### **AWS Configuration**
- [ ] ✅ S3 bucket created with correct settings
- [ ] ✅ IAM user created with programmatic access
- [ ] ✅ IAM policy created and attached
- [ ] ✅ Access keys generated and saved securely
- [ ] ✅ Bucket policy configured for public read (covers only)
- [ ] ✅ CORS policy configured

### **Application Configuration**
- [ ] ✅ .env file updated with all S3 variables
- [ ] ✅ Dependencies installed (aws-sdk, multer, etc.)
- [ ] ✅ S3 configuration file working
- [ ] ✅ File upload service implemented

### **Testing**
- [ ] ✅ Server starts without S3 errors
- [ ] ✅ Can create books in database
- [ ] ✅ Can upload PDF files to S3
- [ ] ✅ Can upload cover images to S3
- [ ] ✅ PDF files generate signed URLs
- [ ] ✅ Cover images are publicly accessible
- [ ] ✅ File deletion works when updating/deleting books

### **Security**
- [ ] ✅ Access keys not in code repository
- [ ] ✅ Only necessary permissions granted
- [ ] ✅ PDF files are private (not publicly readable)
- [ ] ✅ Cover images are public (for direct access)

---

## 🆘 **Need Help?**

If you encounter issues:

1. **Check AWS CloudTrail**: See exactly what API calls are failing
2. **AWS Support**: Use AWS support for billing/access issues
3. **Documentation**: Refer to [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
4. **Test Incrementally**: Test each component separately

---

**Total Setup Time**: 30-60 minutes (depending on AWS familiarity)

**Monthly Cost**: ~$1-5 for typical educational book storage (well within free tier initially)

Your S3 setup will handle:
- ✅ Secure PDF storage with signed URLs
- ✅ Public cover image hosting
- ✅ Scalable file uploads
- ✅ Automatic file organization
- ✅ Role-based access control integration