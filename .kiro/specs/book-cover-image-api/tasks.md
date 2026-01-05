# Implementation Plan: Book Cover Image API

## Overview

This implementation plan addresses the bug where book cover images are uploaded successfully but not returned in API responses. The fix involves modifying the book controller to include cover_image_url in all book API responses, similar to how pdf_access_url is currently handled.

## Tasks

- [ ] 1. Modify book controller helper methods
  - [x] 1.1 Rename `_addSignedUrlsToBook()` to `_addFileUrlsToBook()` and add cover image handling
    - Update method name to reflect that it handles multiple file types
    - Keep existing PDF URL logic intact
    - Add cover image signed URL generation logic
    - Extract S3 key from cover_image_url
    - Generate signed URL for cover image (1 hour expiration)
    - Ensure cover_image_access_url is added to response
    - Remove direct cover_image_url from response for security
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

  - [x] 1.2 Update `_addFileUrlsToBook()` to handle null cover images
    - When cover_image_url is null or undefined, don't add cover_image_access_url to response
    - Don't throw errors for missing cover images
    - Log warnings for malformed cover URLs that can't be processed
    - Handle S3 key extraction failures gracefully
    - _Requirements: 1.3, 2.3_

  - [x] 1.3 Write unit tests for `_addFileUrlsToBook()` helper
    - Test with book that has both PDF and cover (both should have signed URLs)
    - Test with book that has PDF but no cover (only pdf_access_url)
    - Test with book that has cover but no PDF (only cover_image_access_url)
    - Test with book that has neither (no access URLs)
    - Test that direct URLs are removed from response (security)
    - Test that signed URLs contain signature parameters
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2_

- [ ] 2. Update getBooks() method
  - [x] 2.1 Replace `_addSignedUrlsToBook()` calls with `_addFileUrlsToBook()`
    - Update the map function that processes books array
    - Ensure cover_image_access_url is included for all books with covers
    - Maintain existing PDF URL functionality
    - Ensure direct cover_image_url is removed from response
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

  - [x] 2.2 Write unit tests for getBooks() with cover images
    - Test response includes cover_image_access_url for books with covers
    - Test response excludes cover_image_access_url for books without covers
    - Test mixed list of books with and without covers
    - Test that cover_image_access_url contains signed URL parameters
    - Test that direct cover_image_url is not in response
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1, 4.2, 4.3_

  - [x] 2.3 Write property test for getBooks() cover URL inclusion
    - **Property 1: Cover URL Inclusion**
    - **Validates: Requirements 1.1, 2.1**
    - Generate random books with cover URLs
    - Verify all responses include cover_image_access_url field with signed URLs
    - Verify signed URLs contain required signature parameters
    - Run minimum 100 iterations

- [ ] 3. Update getBook() method
  - [x] 3.1 Replace `_addSignedUrlsToBook()` call with `_addFileUrlsToBook()`
    - Update the single book response processing
    - Ensure cover_image_access_url is included in response when cover exists
    - Maintain existing PDF URL functionality
    - Ensure direct cover_image_url is removed from response
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Write unit tests for getBook() with cover images
    - Test response includes cover_image_access_url when book has cover
    - Test response excludes cover_image_access_url when book has no cover
    - Test response structure consistency (both PDF and cover use signed URLs)
    - Test that signed URLs are properly formatted
    - Test that direct cover_image_url is not in response
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3_

  - [x] 3.3 Write property test for getBook() null cover handling
    - **Property 2: Null Cover Handling**
    - **Validates: Requirements 1.3, 2.3**
    - Generate random books without cover URLs
    - Verify responses don't include cover_image_access_url or it's undefined
    - Run minimum 100 iterations

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Integration testing
  - [x] 5.1 Test end-to-end cover image flow
    - Create a test book
    - Upload a cover image
    - Fetch book via getBook() API
    - Verify cover_image_access_url is in response
    - Verify URL is a signed URL (contains signature parameters)
    - Make HTTP GET request to signed URL
    - Verify response is 200 OK and returns image data
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 5.2 Write property test for response structure consistency
    - **Property 4: Response Structure Consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Generate random books with various field combinations
    - Verify both pdf_access_url and cover_image_access_url are present when files exist
    - Verify both use signed URL format (contain signature parameters)
    - Verify consistent structure across all responses
    - Run minimum 100 iterations

  - [ ] 5.3 Test cover URL accessibility with signed URLs
    - Make API request to get book (with authentication)
    - Extract cover_image_access_url from response
    - Make HTTP GET request to signed URL (no auth headers needed for S3)
    - Verify response is 200 OK
    - Verify image data is returned
    - Verify Content-Type is an image type
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The fix is backward compatible - adds new field without breaking existing functionality
- Cover images now use signed URLs (same as PDFs) for consistency and security
- No S3 bucket policy changes needed - signed URLs work with current configuration
- Signed URLs expire after 1 hour (3600 seconds), same as PDFs
