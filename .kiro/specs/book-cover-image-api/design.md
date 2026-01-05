# Design Document

## Overview

This design addresses the missing cover image URLs in book API responses. The solution involves modifying the book controller to include cover_image_access_url fields (signed URLs) in API responses, similar to how pdf_access_url is currently handled. Cover images will use signed URLs for secure, temporary access, maintaining consistency with PDF handling.

## Architecture

The fix will be implemented in the existing book controller layer:

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ Book Controller │ ← Modify to include cover_image_url
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Book Model     │ ← Already has cover_image_url field
└────────┬────────┘
         │
         v
┌─────────────────┐
│  API Response   │ ← Will include cover_image_url
└─────────────────┘
```

## Components and Interfaces

### Modified Components

#### BookController

**Methods to modify:**
- `getBooks()` - Add cover_image_url to response
- `getBook()` - Add cover_image_url to response
- `_addSignedUrlsToBook()` - Rename and expand to handle both PDF and cover URLs

**New helper method:**
```javascript
_addFileUrlsToBook(book) {
  const bookData = book.toSafeJSON ? book.toSafeJSON() : book.get();
  
  // Handle PDF URL (signed URL for security)
  if (bookData.pdf_url) {
    bookData.pdf_access_url = this._generatePdfAccessUrl(bookData.pdf_url, 3600);
    delete bookData.pdf_url;
  }

  // Handle cover image URL (signed URL for security and consistency)
  if (bookData.cover_image_url) {
    try {
      const key = this._extractS3Key(bookData.cover_image_url);
      if (key) {
        bookData.cover_image_access_url = generateSignedUrl(key, 3600);
      }
    } catch (error) {
      console.warn('Failed to generate cover image signed URL:', error.message);
    }
    // Remove direct URL for security
    delete bookData.cover_image_url;
  }

  return bookData;
}
```

## Data Models

### Book Model (No changes needed)

The Book model already has the `cover_image_url` field:

```javascript
cover_image_url: {
  type: DataTypes.TEXT,
  allowNull: true,
  field: 'cover_image_url'
}
```

### API Response Format

**Current response (missing cover):**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "uuid",
      "name": "Book Title",
      "pdf_access_url": "https://signed-url...",
      // cover_image_access_url is missing!
    }
  }
}
```

**New response (with cover):**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "uuid",
      "name": "Book Title",
      "pdf_access_url": "https://signed-url-for-pdf...",
      "cover_image_access_url": "https://signed-url-for-cover..."
    }
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cover URL Inclusion

*For any* book returned by the API, if the book has a cover_image_url in the database, then the API response should include a cover_image_access_url field with a signed URL.

**Validates: Requirements 1.1, 2.1**

### Property 2: Null Cover Handling

*For any* book returned by the API, if the book does not have a cover_image_url in the database, then the API response should not include a cover_image_access_url field (or it should be null).

**Validates: Requirements 1.3, 2.3**

### Property 3: Signed URL Accessibility

*For any* cover_image_access_url returned in the API response, the signed URL should be accessible and return a valid image (HTTP GET should return 200 status with image content).

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Response Structure Consistency

*For any* book returned by the API, the response should include both pdf_access_url and cover_image_access_url fields (when files exist) in the same object structure, both using signed URLs.

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Existing Error Handling (No changes needed)

The current error handling in the book controller is sufficient:
- 404 errors for books not found
- 403 errors for access denied
- 500 errors for server errors

### Cover Image Specific Handling

- If `cover_image_url` is null or empty, don't include `cover_image_access_url` in response
- If `cover_image_url` exists but signed URL generation fails, log warning and omit `cover_image_access_url`
- Don't fail the entire request if cover URL processing fails
- Signed URLs expire after 1 hour (3600 seconds), same as PDFs

## Testing Strategy

### Unit Tests

1. **Test cover URL inclusion for books with covers**
   - Create a book with cover_image_url
   - Call getBook() and verify cover_image_access_url is in response
   - Verify it's a signed URL (contains signature parameters)

2. **Test null cover handling**
   - Create a book without cover_image_url
   - Call getBook() and verify cover_image_access_url is not present or null

3. **Test book list includes covers**
   - Create multiple books with and without covers
   - Call getBooks() and verify books with covers have cover_image_access_url field

4. **Test response structure consistency**
   - Verify both pdf_access_url and cover_image_access_url are present
   - Verify both use signed URL format
   - Verify field naming is consistent

5. **Test signed URL expiration**
   - Verify signed URLs include expiration parameters
   - Verify URLs are valid for 1 hour (3600 seconds)

### Property-Based Tests

Property-based tests will validate the correctness properties across many randomly generated inputs:

1. **Property Test: Cover URL Inclusion (Property 1)**
   - Generate random books with cover URLs
   - Verify all responses include cover_image_access_url as signed URLs
   - **Minimum 100 iterations**

2. **Property Test: Null Cover Handling (Property 2)**
   - Generate random books without cover URLs
   - Verify responses don't include cover_image_access_url or it's null
   - **Minimum 100 iterations**

3. **Property Test: Signed URL Validity (Property 3)**
   - Generate random books with covers
   - Verify all signed URLs are valid and accessible
   - **Minimum 100 iterations**

4. **Property Test: Response Structure (Property 4)**
   - Generate random books with various field combinations
   - Verify consistent structure across all responses
   - Verify both PDF and cover use signed URLs
   - **Minimum 100 iterations**

### Integration Tests

1. **Test end-to-end cover image flow**
   - Upload a cover image
   - Fetch the book via API
   - Verify cover_image_access_url is in response
   - Verify signed URL is accessible
   - Verify image can be downloaded using the signed URL

2. **Test with Flutter client simulation**
   - Make API request with authentication headers
   - Extract cover_image_access_url from response
   - Make request to signed URL (no auth headers needed for S3)
   - Verify image loads successfully

### Test Configuration

- Use Jest as the testing framework (already configured)
- Use fast-check for property-based testing
- Each property test should run minimum 100 iterations
- Tag each test with: **Feature: book-cover-image-api, Property {number}: {property_text}**

## Implementation Notes

### Key Changes

1. **Modify `getBooks()` method:**
   - Replace `_addSignedUrlsToBook()` call with `_addFileUrlsToBook()`
   - Ensure cover_image_access_url is included in response

2. **Modify `getBook()` method:**
   - Replace `_addSignedUrlsToBook()` call with `_addFileUrlsToBook()`
   - Ensure cover_image_access_url is included in response

3. **Rename and expand `_addSignedUrlsToBook()` to `_addFileUrlsToBook()`:**
   - Keep existing PDF URL logic
   - Add cover image signed URL generation logic
   - Extract S3 key from cover_image_url
   - Generate signed URL for cover image (1 hour expiration)
   - Remove direct cover_image_url from response (security)
   - Return both pdf_access_url and cover_image_access_url

4. **Add helper method `_extractS3Key()`:**
   - Extract S3 key from full S3 URL
   - Handle different S3 URL formats
   - Return null for invalid URLs

### No Changes Needed

- Book model (already has cover_image_url field)
- Upload endpoints (already working correctly after ACL fix)
- S3 configuration (no bucket policy changes needed - using signed URLs)
- File upload service (ACL issue already fixed)

### Backward Compatibility

This change is backward compatible:
- Adds a new field to responses (doesn't remove or change existing fields)
- Clients that don't use cover_image_access_url can ignore it
- Existing PDF access functionality remains unchanged
- Uses same signed URL approach as PDFs for consistency and security
