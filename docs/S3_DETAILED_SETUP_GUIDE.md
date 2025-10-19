# AWS S3 Detailed Setup Guide - Step by Step
## Educational Book Subscription System

**Platform**: Windows  
**Time Required**: 45-90 minutes  
**Difficulty**: Beginner-friendly  

This guide provides extremely detailed, click-by-click instructions with visual descriptions for setting up AWS S3.

---

## 📋 **Before You Start - Preparation**

### **What You'll Need:**
- ✅ A valid email address
- ✅ Phone number for verification
- ✅ Credit/Debit card (for AWS verification - won't be charged for free tier)
- ✅ Internet connection
- ✅ Web browser (Chrome, Firefox, Edge recommended)
- ✅ Notepad or text editor to save important information

### **Information to Collect During Setup:**
Prepare a notepad document to save these as you create them:
```
AWS Account Email: _____________________
S3 Bucket Name: _______________________
AWS Region: __________________________
Access Key ID: _______________________
Secret Access Key: ___________________
```

---

## 🔐 **PART 1: AWS ACCOUNT SETUP**

### **Step 1.1: Create AWS Account (Skip if you have one)**

1. **Open your web browser**
2. **Navigate to**: https://aws.amazon.com
3. **Look for**: Orange "Create an AWS Account" button (top right corner)
4. **Click**: "Create an AWS Account"

#### **Account Information Page:**
5. **Email address**: Enter your email (this will be your AWS login)
6. **Password**: Create a strong password (8+ characters, mix of letters/numbers/symbols)
7. **Confirm password**: Re-enter the same password
8. **AWS account name**: Enter something like "Educational-Books-App"
9. **Click**: "Continue (step 1 of 5)"

#### **Contact Information Page:**
10. **Account type**: Select "Personal" 
11. **Full name**: Enter your full legal name
12. **Phone number**: Enter your mobile number with country code
13. **Country/Region**: Select your country
14. **Address**: Enter your complete address
15. **City**: Your city
16. **State/Province**: Your state
17. **Postal code**: Your ZIP/postal code
18. **Click**: "Continue (step 2 of 5)"

#### **Payment Information Page:**
19. **Credit card number**: Enter your card number (required for verification)
20. **Expiration date**: MM/YY format
21. **CVV**: Security code from back of card
22. **Cardholder name**: Name as it appears on card
23. **Check**: "I have read and agree to the AWS Customer Agreement"
24. **Click**: "Continue (step 3 of 5)"

#### **Phone Verification:**
25. **Phone number**: Confirm the number shown is correct
26. **Security check**: Enter the CAPTCHA code shown
27. **Click**: "Call me now" or "Text me (SMS)"
28. **Answer the call/check SMS**: You'll receive a 4-digit code
29. **Enter the verification code**: Type the 4 digits you received
30. **Click**: "Continue (step 4 of 5)"

#### **Support Plan:**
31. **Select**: "Basic support - Free" (should be pre-selected)
32. **Click**: "Complete sign up"

#### **Confirmation:**
33. **Wait**: You'll see "Congratulations" page
34. **Click**: "Go to the AWS Management Console"

### **Step 1.2: Sign In to AWS Console**

35. **You'll see AWS Sign In page**
36. **Email**: Enter the email you used to create the account
37. **Click**: "Next"
38. **Password**: Enter your AWS password
39. **Click**: "Sign In"
40. **You should now see**: AWS Management Console dashboard

---

## 🪣 **PART 2: CREATE S3 BUCKET**

### **Step 2.1: Navigate to S3 Service**

1. **Look at the top of the page**: You'll see a search bar that says "Search for services, features..."
2. **Click in the search box**
3. **Type**: `s3`
4. **You'll see**: "S3" appear in dropdown with an orange bucket icon
5. **Click**: "S3" from the dropdown
6. **You'll arrive at**: S3 Management Console (shows "Amazon S3" at the top)

### **Step 2.2: Create New Bucket**

7. **Look for**: Blue "Create bucket" button (should be prominent on the page)
8. **Click**: "Create bucket"
9. **You'll see**: "Create bucket" page with multiple sections

#### **Section 1: General configuration**

10. **Bucket name field**: 
    - **Type**: `educational-books-storage-nikhil` (replace "nikhil" with your name)
    - **Note**: Must be globally unique, only lowercase letters, numbers, hyphens
    - **If name is taken**: Try adding numbers like `educational-books-storage-nikhil-2024`

11. **AWS Region dropdown**:
    - **Look for**: Dropdown that might say "US East (N. Virginia) us-east-1"
    - **Click**: The dropdown arrow
    - **Select**: "US East (N. Virginia) us-east-1" (recommended for beginners)
    - **Save this**: Write down "us-east-1" in your notepad

12. **Copy settings from existing bucket**: 
    - **Leave blank**: This section should be empty

#### **Section 2: Object Ownership**

13. **Object Ownership**: 
    - **You'll see**: Two radio button options
    - **Select**: "ACLs enabled" (click the radio button)
    - **You'll see**: "Bucket owner preferred" option appear
    - **Select**: "Bucket owner preferred"

#### **Section 3: Block Public Access settings for this bucket**

14. **This is CRITICAL**: You'll see 4 checkboxes
15. **UNCHECK these two** (click to remove checkmark):
    - ❌ "Block public access to buckets and objects granted through new access control lists (ACLs)"
    - ❌ "Block public access to buckets and objects granted through any access control lists (ACLs)"

16. **KEEP CHECKED** (should already be checked):
    - ✅ "Block public access to buckets and objects granted through new public bucket or access point policies"
    - ✅ "Block public and cross-account access to buckets and objects through any public bucket or access point policies"

17. **Warning popup**: You'll see a warning about public access
    - **Type**: `confirm` in the text box
    - **Click**: "Confirm"

#### **Section 4: Bucket Versioning**

18. **Bucket Versioning**:
    - **You'll see**: Two radio buttons
    - **Select**: "Enable" (click the radio button)

#### **Section 5: Tags (Optional)**

19. **Tags**: Skip this section (leave empty)

#### **Section 6: Default encryption**

20. **Default encryption**:
    - **You'll see**: "Enable" should be selected by default
    - **Encryption type**: Select "Amazon S3 managed keys (SSE-S3)"
    - **Leave other settings as default**

#### **Section 7: Advanced settings**

21. **Object Lock**: Leave "Disable" selected (default)

### **Step 2.3: Create the Bucket**

22. **Scroll to bottom** of the page
23. **Click**: Orange "Create bucket" button
24. **Wait**: Page will load (may take 10-30 seconds)
25. **Success**: You should see green banner saying "Successfully created bucket 'your-bucket-name'"
26. **Save**: Write your bucket name in your notepad

---

## 🛠️ **PART 3: CONFIGURE BUCKET POLICIES**

### **Step 3.1: Access Bucket Settings**

1. **You should see**: List of buckets in S3 console
2. **Find your bucket**: Look for the name you just created
3. **Click**: On your bucket name (it's a blue hyperlink)
4. **You'll see**: Bucket overview page with tabs at top

### **Step 3.2: Configure Bucket Policy**

5. **Click**: "Permissions" tab (should be near "Objects", "Properties", etc.)
6. **Scroll down**: Look for "Bucket policy" section
7. **Click**: "Edit" button in the Bucket policy section
8. **You'll see**: A large text box for JSON policy

9. **Copy this policy** (replace YOUR-BUCKET-NAME with your actual bucket name):

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

10. **In the text box**:
    - **Clear**: Any existing content (should be empty)
    - **Paste**: The policy above
    - **Replace**: "YOUR-BUCKET-NAME" with your actual bucket name (appears twice)
    - **Example**: If your bucket is "educational-books-storage-nikhil", replace both instances

11. **Click**: Orange "Save changes" button
12. **Success**: You should see green banner confirming policy saved

### **Step 3.3: Configure CORS Policy**

13. **Still in Permissions tab**
14. **Scroll down**: Look for "Cross-origin resource sharing (CORS)" section
15. **Click**: "Edit" button in CORS section
16. **You'll see**: Another text box for JSON

17. **Copy this CORS policy**:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

18. **In the CORS text box**:
    - **Clear**: Any existing content
    - **Paste**: The CORS policy above

19. **Click**: Orange "Save changes" button
20. **Success**: Green banner should confirm CORS policy saved

---

## 👤 **PART 4: CREATE IAM USER**

### **Step 4.1: Navigate to IAM Service**

1. **Click**: AWS logo (top left) to go back to main console
2. **In search bar**: Type `iam`
3. **Click**: "IAM" from dropdown (has a key icon)
4. **You'll see**: IAM Dashboard

### **Step 4.2: Create New User**

5. **Left sidebar**: Click "Users" (should have a person icon)
6. **You'll see**: Users page (might be empty if first user)
7. **Click**: Blue "Create user" button (top right area)

#### **Step 1: Specify user details**

8. **User name field**: 
   - **Type**: `educational-book-app-user`

9. **Provide user access to the AWS Management Console**:
   - **Leave UNCHECKED**: We only want programmatic access

10. **Click**: Orange "Next" button

#### **Step 2: Set permissions**

11. **Permission options**: You'll see three options
12. **Select**: "Attach policies directly" (click the radio button)
13. **For now**: Click "Next" (we'll create custom policy after)

#### **Step 3: Review and create**

14. **Review**: Check that user name is correct
15. **Click**: Orange "Create user" button
16. **Success**: You should see confirmation page

### **Step 4.3: Create Custom Policy**

17. **Left sidebar**: Click "Policies"
18. **Click**: Blue "Create policy" button

#### **Policy Creation:**

19. **You'll see**: Policy editor with "Visual" and "JSON" tabs
20. **Click**: "JSON" tab
21. **Clear**: Any existing content in the text box

22. **Copy this policy** (replace YOUR-BUCKET-NAME):

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

23. **Paste**: The policy in the JSON box
24. **Replace**: "YOUR-BUCKET-NAME" with your bucket name (appears twice)
25. **Click**: Orange "Next" button

#### **Policy Details:**

26. **Policy name**: Type `EducationalBookAppS3Policy`
27. **Description**: Type `S3 access policy for educational book app`
28. **Click**: Orange "Create policy" button
29. **Success**: Policy created confirmation

### **Step 4.4: Attach Policy to User**

30. **Left sidebar**: Click "Users"
31. **Find your user**: Click on "educational-book-app-user"
32. **Click**: "Permissions" tab
33. **Click**: Blue "Add permissions" dropdown button
34. **Select**: "Attach existing policies directly"

35. **Search for policy**:
    - **In search box**: Type `EducationalBookAppS3Policy`
    - **Check the box**: Next to your policy name
    - **Click**: Orange "Add permissions" button

36. **Success**: Policy attached to user

---

## 🔑 **PART 5: GENERATE ACCESS KEYS**

### **Step 5.1: Create Access Keys**

1. **Still on user page**: Should be viewing "educational-book-app-user"
2. **Click**: "Security credentials" tab
3. **Scroll down**: Look for "Access keys" section
4. **Click**: Blue "Create access key" button

#### **Access Key Best Practices:**

5. **Use case**: Select "Application running outside AWS"
6. **Confirmation**: Check the box "I understand the above recommendation..."
7. **Click**: Orange "Next" button

#### **Description (Optional):**

8. **Description tag**: Type `Educational Book App Production Keys`
9. **Click**: Orange "Create access key" button

#### **Retrieve Access Keys:**

10. **CRITICAL STEP**: You'll see your access keys
11. **Copy Access Key ID**:
    - **Select all text** in "Access key ID" field
    - **Press**: Ctrl+C to copy
    - **Paste**: In your notepad under "Access Key ID: "

12. **Copy Secret Access Key**:
    - **Click**: "Show" next to Secret access key
    - **Select all text** in the revealed field
    - **Press**: Ctrl+C to copy  
    - **Paste**: In your notepad under "Secret Access Key: "

13. **Download CSV (Optional but Recommended)**:
    - **Click**: "Download .csv file" button
    - **Save**: To a secure location on your computer

14. **Click**: Orange "Done" button

⚠️ **WARNING**: This is your ONLY chance to see the Secret Access Key. If you lose it, you'll need to create new keys.

---

## ⚙️ **PART 6: CONFIGURE YOUR APPLICATION**

### **Step 6.1: Update Environment File**

1. **Open File Explorer** (Windows key + E)
2. **Navigate to**: `C:\Users\Nikhil\my_node_app`
3. **Look for**: `.env` file
4. **Right-click**: On `.env` file
5. **Select**: "Open with" → "Notepad" (or your preferred text editor)

### **Step 6.2: Add S3 Configuration**

6. **Find the AWS S3 section** in your .env file (should look like):
```env
# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-book-uploads-bucket
```

7. **Replace the values**:
   - **AWS_ACCESS_KEY_ID**: Replace with your Access Key ID from notepad
   - **AWS_SECRET_ACCESS_KEY**: Replace with your Secret Access Key from notepad
   - **AWS_REGION**: Should be `us-east-1` (or the region you chose)
   - **AWS_S3_BUCKET**: Replace with your bucket name

8. **Example of completed configuration**:
```env
# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=AKIA123456789EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=educational-books-storage-nikhil
```

9. **Save the file**: Press Ctrl+S
10. **Close**: The text editor

---

## 🧪 **PART 7: TEST YOUR S3 SETUP**

### **Step 7.1: Install AWS CLI (Optional but Helpful)**

1. **Open PowerShell**:
   - **Press**: Windows key + R
   - **Type**: `powershell`
   - **Press**: Enter

2. **Install AWS CLI**:
```powershell
winget install Amazon.AWSCLI
```

3. **Restart PowerShell**: Close and reopen PowerShell

4. **Configure AWS CLI**:
```powershell
aws configure
```

5. **Enter your credentials when prompted**:
   - **AWS Access Key ID**: Paste your Access Key ID
   - **AWS Secret Access Key**: Paste your Secret Access Key
   - **Default region name**: Type `us-east-1`
   - **Default output format**: Type `json`

### **Step 7.2: Test Bucket Access**

6. **Test bucket listing**:
```powershell
aws s3 ls s3://your-bucket-name-here
```
Replace `your-bucket-name-here` with your actual bucket name.

**Expected result**: Should show empty bucket or existing files

7. **Test file upload**:
```powershell
# Create a test file
echo "This is a test file" > test-file.txt

# Upload to S3
aws s3 cp test-file.txt s3://your-bucket-name-here/test/test-file.txt

# List bucket contents
aws s3 ls s3://your-bucket-name-here/test/
```

**Expected result**: Should show your uploaded test file

8. **Clean up test file**:
```powershell
# Remove from S3
aws s3 rm s3://your-bucket-name-here/test/test-file.txt

# Remove local file
Remove-Item test-file.txt
```

### **Step 7.3: Test with Your Application**

9. **Open PowerShell** in your project directory:
```powershell
cd "C:\Users\Nikhil\my_node_app"
```

10. **Start your application** (if backend is ready):
```powershell
npm start
```

11. **Test health endpoint** (open new PowerShell window):
```powershell
curl http://localhost:3000/health
```

**Expected result**: Should show JSON response indicating server is running

---

## ✅ **PART 8: VERIFICATION CHECKLIST**

### **AWS Console Verification**

1. **S3 Bucket**:
   - [ ] ✅ Bucket created with correct name
   - [ ] ✅ Region set to us-east-1 (or your chosen region)
   - [ ] ✅ Versioning enabled
   - [ ] ✅ Encryption enabled
   - [ ] ✅ Bucket policy configured
   - [ ] ✅ CORS policy configured

2. **IAM User**:
   - [ ] ✅ User created: `educational-book-app-user`
   - [ ] ✅ Custom policy created: `EducationalBookAppS3Policy`
   - [ ] ✅ Policy attached to user
   - [ ] ✅ Access keys generated and saved

### **Application Configuration**

3. **Environment File**:
   - [ ] ✅ AWS_ACCESS_KEY_ID set correctly
   - [ ] ✅ AWS_SECRET_ACCESS_KEY set correctly
   - [ ] ✅ AWS_REGION set correctly
   - [ ] ✅ AWS_S3_BUCKET set correctly

### **Testing**

4. **Basic Tests**:
   - [ ] ✅ AWS CLI can list bucket contents
   - [ ] ✅ Can upload test file to bucket
   - [ ] ✅ Can delete test file from bucket
   - [ ] ✅ Application server starts without S3 errors

---

## 🐛 **TROUBLESHOOTING GUIDE**

### **Common Error 1: "Access Denied"**

**Error Message**: `AccessDenied: Access Denied`

**Possible Causes**:
- Wrong Access Key ID or Secret Access Key
- IAM policy doesn't have correct permissions
- Bucket name mismatch in policy

**Solutions**:
1. **Double-check credentials** in .env file
2. **Verify IAM policy** has your correct bucket name
3. **Re-generate access keys** if needed

### **Common Error 2: "Bucket Not Found"**

**Error Message**: `NoSuchBucket: The specified bucket does not exist`

**Solutions**:
1. **Check bucket name** in .env file (no typos)
2. **Verify region** - bucket and app must use same region
3. **Check bucket exists** in AWS S3 console

### **Common Error 3: "Invalid Bucket Name"**

**Error Message**: `InvalidBucketName: The specified bucket is not valid`

**Solutions**:
1. **Check bucket name format**:
   - Only lowercase letters, numbers, hyphens
   - No spaces, underscores, or capital letters
   - 3-63 characters long
   - Must start and end with letter or number

### **Common Error 4: CORS Errors in Browser**

**Error Message**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
1. **Check CORS policy** in S3 bucket permissions
2. **Add your domain** to AllowedOrigins in CORS policy
3. **Include localhost** addresses for development

### **Getting Help**

If you're still stuck:

1. **AWS Support**: Use AWS Support Center for account issues
2. **AWS Documentation**: https://docs.aws.amazon.com/s3/
3. **Double-check each step**: Go through this guide again carefully
4. **Check AWS CloudTrail**: See detailed logs of API calls

---

## 🎉 **SUCCESS! Your S3 Setup is Complete**

You now have:
- ✅ **Working S3 bucket** for file storage
- ✅ **Secure access keys** for your application  
- ✅ **Proper permissions** for book PDFs and cover images
- ✅ **CORS configured** for web application access
- ✅ **Cost-effective setup** using free tier

### **What's Next?**

1. **Start your backend server** and test file uploads
2. **Connect your frontend** to the file upload endpoints
3. **Test the complete flow**: Create book → Upload PDF → Upload cover image
4. **Monitor AWS costs** in the billing dashboard

Your educational book subscription system now has professional-grade file storage capabilities!