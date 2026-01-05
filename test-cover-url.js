/**
 * Test script to diagnose cover image URL issues
 * Run with: node test-cover-url.js
 */

import { extractS3Key, generateSignedUrl, generatePublicUrl } from './src/config/aws.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('=== S3 Cover Image URL Test ===\n');

// Test different URL formats
const testUrls = [
  // Virtual-hosted-style URL
  'https://academixstore.s3.ap-south-1.amazonaws.com/books/covers/1234567890-abc123.jpg',
  // Path-style URL
  'https://s3.ap-south-1.amazonaws.com/academixstore/books/covers/1234567890-abc123.jpg',
  // Legacy format
  'https://s3.amazonaws.com/academixstore/books/covers/1234567890-abc123.jpg',
];

console.log('Testing URL extraction and signed URL generation:\n');

testUrls.forEach((url, index) => {
  console.log(`Test ${index + 1}: ${url}`);
  
  try {
    const key = extractS3Key(url);
    console.log(`  ✅ Extracted key: ${key}`);
    
    if (key) {
      try {
        const signedUrl = generateSignedUrl(key, 3600);
        console.log(`  ✅ Signed URL generated: ${signedUrl.substring(0, 100)}...`);
      } catch (error) {
        console.log(`  ❌ Failed to generate signed URL: ${error.message}`);
      }
      
      try {
        const publicUrl = generatePublicUrl(key);
        console.log(`  ℹ️  Public URL: ${publicUrl}`);
      } catch (error) {
        console.log(`  ❌ Failed to generate public URL: ${error.message}`);
      }
    } else {
      console.log(`  ❌ Failed to extract key`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('');
});

// Test with actual environment variables
console.log('\n=== Environment Configuration ===');
console.log(`AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
console.log(`AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || 'NOT SET'}`);
console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);

// Generate a test signed URL with current config
console.log('\n=== Test Signed URL Generation ===');
const testKey = 'books/covers/test-image.jpg';
try {
  const signedUrl = generateSignedUrl(testKey, 3600);
  console.log(`✅ Successfully generated signed URL for key: ${testKey}`);
  console.log(`URL: ${signedUrl}`);
  console.log('\nYou can test this URL in your browser (it will 404 if the file doesn\'t exist, but should NOT show Access Denied)');
} catch (error) {
  console.log(`❌ Failed to generate signed URL: ${error.message}`);
  console.log('Stack:', error.stack);
}

console.log('\n=== Bucket Policy Recommendation ===');
console.log(`
Add this policy to your S3 bucket "${process.env.AWS_S3_BUCKET || 'YOUR-BUCKET'}":

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadCoverImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${process.env.AWS_S3_BUCKET || 'YOUR-BUCKET'}/books/covers/*"
    }
  ]
}

This will make cover images publicly accessible without needing signed URLs.
`);
