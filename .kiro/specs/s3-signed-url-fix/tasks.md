# Implementation Plan: S3 Signed URL Fix

## Overview

This implementation plan addresses the S3 Access Denied error by creating a robust S3 key extraction utility and updating the order route to use it correctly. The tasks are organized to deliver incremental value, with core functionality first, followed by testing and optional enhancements.

## Tasks

- [-] 1. Implement S3 key extraction utility
  - Create `extractS3Key` function in `src/config/aws.js`
  - Handle virtual-hosted-style URLs (bucket.s3.region.amazonaws.com/key)
  - Handle path-style URLs (s3.region.amazonaws.com/bucket/key)
  - Strip query parameters and fragments
  - Handle URL-encoded characters
  - Return null for invalid URLs
  - Add JSDoc documentation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Write unit tests for S3 key extraction
  - Test virtual-hosted-style URL extraction
  - Test path-style URL extraction
  - Test URLs with query parameters
  - Test URLs with fragments
  - Test URL-encoded characters
  - Test invalid URL formats
  - Test null/undefined inputs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.2 Write property test for S3 key extraction
  - **Property 1: S3 Key Extraction Correctness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 1.3 Write property test for invalid URL handling
  - **Property 2: Invalid URL Handling**
  - **Validates: Requirements 1.5**

- [ ] 2. Update order route to use extraction utility
  - Import `extractS3Key` from `src/config/aws.js`
  - Replace inline extraction logic in `/my-purchases` endpoint
  - Add error handling for failed extraction
  - Add logging for debugging (book ID, URL, extracted key)
  - Ensure pdf_url is removed from response for security
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2.1 Write unit tests for updated order route
  - Test purchased books endpoint with valid PDF URLs
  - Test with books missing pdf_url
  - Test with books having invalid pdf_url
  - Test that pdf_url is removed from response
  - Test error handling and logging
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2.2 Write property test for correct key usage
  - **Property 4: Correct Key Usage**
  - **Validates: Requirements 2.2, 3.3, 3.4**

- [ ] 3. Checkpoint - Test the fix with real data
  - Run the application locally
  - Create a test order with a book that has a PDF
  - Call `/api/orders/my-purchases` endpoint
  - Verify the pre-signed URL works in a browser
  - Verify no Access Denied errors
  - Check logs for any errors

- [ ] 4. Add validation for pre-signed URL structure
  - Create utility function to validate pre-signed URL format
  - Check for required AWS signature parameters
  - Verify expiration parameter matches requested duration
  - _Requirements: 2.3, 2.5_

- [ ] 4.1 Write property test for pre-signed URL structure
  - **Property 3: Pre-signed URL Structure**
  - **Validates: Requirements 2.3, 2.5**

- [ ] 5. Add s3_key field to Book model (Optional Enhancement)
  - Add `s3_key` field to Book model schema
  - Create database migration to add column
  - Update file upload service to store both URL and key
  - Update order route to prefer s3_key over extraction
  - Add data integrity validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.1 Write property test for data integrity
  - **Property 5: Data Integrity**
  - **Validates: Requirements 3.5**

- [ ] 6. Enhance error handling and logging
  - Add specific error types for different S3 failures
  - Ensure error messages don't expose AWS credentials
  - Add structured logging with context (book ID, S3 key)
  - Test error handling with missing credentials
  - Test error handling with invalid bucket
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6.1 Write property test for error handling
  - **Property 6: Error Handling and Logging**
  - **Validates: Requirements 2.4, 4.4, 4.5**

- [ ] 6.2 Write property test for graceful degradation
  - **Property 7: Graceful Degradation**
  - **Validates: Requirements 5.5**

- [ ] 7. Add S3 configuration validation
  - Add startup validation for AWS credentials
  - Add S3 connectivity test on startup
  - Log warnings for missing configuration
  - Create health check endpoint for S3 status
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7.1 Write unit tests for configuration validation
  - Test startup validation with valid credentials
  - Test startup validation with missing credentials
  - Test S3 connectivity check
  - Test health check endpoint
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Final checkpoint - Comprehensive testing
  - Run all unit tests and property tests
  - Test with various URL formats from production data
  - Verify Flutter app can display PDFs
  - Check error handling with invalid scenarios
  - Review logs for any issues
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks are required for comprehensive solution
- Core fix is in tasks 1-3 (extraction utility + order route update)
- Tasks 4-7 add robustness and future-proofing
- Each property test should run minimum 100 iterations
- Property tests use fast-check library with Jest
- Focus on getting the core fix working first, then add enhancements
