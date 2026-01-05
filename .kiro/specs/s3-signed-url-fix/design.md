# Design Document: S3 Signed URL Fix

## Overview

This design addresses the S3 Access Denied error by implementing proper S3 key extraction and pre-signed URL generation. The solution involves creating a robust utility function for extracting S3 keys from URLs, updating the order route to use this utility, and optionally adding a dedicated database field for storing S3 keys.

The core issue is that the current implementation uses `url.split('/').slice(-2).join('/')` which only captures the last two path segments. For a URL like `https://academixstore.s3.ap-south-1.amazonaws.com/c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf`, this extracts `c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf` incorrectly as `1767066588674-6f1b9c31.pdf`, missing the UUID directory prefix.

## Architecture

### Component Structure

```
src/
├── config/
│   └── aws.js (updated with extractS3Key utility)
├── routes/
│   └── order.js (updated to use new extraction logic)
└── models/
    └── Book.js (optionally add s3_key field)
```

### Data Flow

1. User requests purchased books via `/api/orders/my-purchases`
2. Order route fetches orders with book details from database
3. For each book with a `pdf_url`:
   - Extract S3 key using utility function
   - Generate pre-signed URL using AWS SDK
   - Return pre-signed URL to user (valid for 1 hour)
4. User's Flutter app uses pre-signed URL to display PDF

## Components and Interfaces

### S3 Key Extraction Utility

**Location:** `src/config/aws.js`

**Function Signature:**
```javascript
/**
 * Extract S3 key from a full S3 URL
 * @param {string} url - Full S3 URL
 * @returns {string|null} - Extracted S3 key or null if invalid
 */
export const extractS3Key = (url) => { ... }
```

**Supported URL Formats:**
- Virtual-hosted-style: `https://bucket-name.s3.region.amazonaws.com/path/to/file.pdf`
- Path-style: `https://s3.region.amazonaws.com/bucket-name/path/to/file.pdf`
- Legacy format: `https://s3.amazonaws.com/bucket-name/path/to/file.pdf`

**Algorithm:**
1. Parse URL to extract pathname
2. Remove leading slash
3. For path-style URLs, remove bucket name from the beginning
4. For virtual-hosted-style URLs, use the entire pathname as the key
5. Decode any URL-encoded characters
6. Return the extracted key

### Updated Order Route

**Location:** `src/routes/order.js`

**Changes:**
- Import `extractS3Key` from `aws.js`
- Replace inline extraction logic with utility function call
- Add error handling for failed key extraction
- Add logging for debugging

**Updated Code Section:**
```javascript
// Generate signed URL for PDF access (valid for 1 hour)
if (orderData.book && orderData.book.pdf_url) {
  try {
    const key = extractS3Key(orderData.book.pdf_url);
    if (key) {
      orderData.book.pdf_access_url = generateSignedUrl(key, 3600);
    } else {
      console.error('Failed to extract S3 key from URL:', orderData.book.pdf_url);
    }
    // Remove direct PDF URL for security
    delete orderData.book.pdf_url;
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
  }
}
```

## Data Models

### Book Model (Optional Enhancement)

**New Field:**
```javascript
s3_key: {
  type: DataTypes.TEXT,
  allowNull: true,
  field: 's3_key',
  comment: 'S3 object key for the PDF file'
}
```

**Migration Strategy:**
- Add new column to books table
- Populate existing records by extracting keys from pdf_url
- Update upload logic to store both URL and key

**Benefits:**
- Eliminates need for runtime key extraction
- Improves performance
- Reduces potential for extraction errors
- Makes debugging easier

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: S3 Key Extraction Correctness

*For any* valid S3 URL (virtual-hosted-style or path-style), extracting the S3 key should return the complete object path without bucket name, region, query parameters, or fragments.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Invalid URL Handling

*For any* invalid or malformed URL, the extraction function should return null or throw a descriptive error without crashing.

**Validates: Requirements 1.5**

### Property 3: Pre-signed URL Structure

*For any* valid S3 key and expiration time, the generated pre-signed URL should contain all required AWS signature parameters (X-Amz-Algorithm, X-Amz-Credential, X-Amz-Date, X-Amz-Expires, X-Amz-Signature, X-Amz-SignedHeaders) and the expiration should match the requested duration.

**Validates: Requirements 2.3, 2.5**

### Property 4: Correct Key Usage

*For any* book record, when generating a pre-signed URL, the system should use the stored S3 key if available, otherwise extract the key from the pdf_url, and the extracted/stored key should match the key used in URL generation.

**Validates: Requirements 2.2, 3.3, 3.4**

### Property 5: Data Integrity

*For any* book record with both s3_key and pdf_url fields populated, extracting the key from the pdf_url should yield the same value as the stored s3_key field.

**Validates: Requirements 3.5**

### Property 6: Error Handling and Logging

*For any* error during pre-signed URL generation, the system should log the error with relevant context (book ID, S3 key) and return a user-friendly error message that does not expose AWS credentials or internal implementation details.

**Validates: Requirements 2.4, 4.4, 4.5**

### Property 7: Graceful Degradation

*For any* request to access purchased books when S3 is not configured, the system should return an appropriate error message indicating the service is unavailable without crashing.

**Validates: Requirements 5.5**

## Error Handling

### S3 Key Extraction Errors

- **Invalid URL format**: Return null and log warning
- **Missing URL**: Return null
- **Malformed URL**: Return null and log error

### Pre-signed URL Generation Errors

- **Missing S3 key**: Log error with book ID, skip URL generation for that book
- **AWS SDK error**: Log error with context, return user-friendly message
- **Invalid credentials**: Log error, return "Service temporarily unavailable"
- **Network error**: Log error, return "Unable to generate access URL"

### Database Errors

- **Missing pdf_url field**: Skip URL generation, log warning
- **Null or empty pdf_url**: Skip URL generation

### Error Response Format

```javascript
{
  success: false,
  message: "Unable to generate PDF access URL",
  error: "PDF_ACCESS_UNAVAILABLE"
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **S3 Key Extraction Examples**:
   - Test extraction from virtual-hosted-style URL
   - Test extraction from path-style URL
   - Test extraction with query parameters
   - Test extraction with URL fragments
   - Test extraction with URL-encoded characters
   - Test with null/undefined input
   - Test with non-URL strings

2. **Pre-signed URL Generation Examples**:
   - Test URL generation with valid key
   - Test URL generation with custom expiration
   - Test error handling with invalid key
   - Test error handling with missing credentials

3. **Order Route Integration**:
   - Test purchased books endpoint with valid data
   - Test with books missing pdf_url
   - Test with books having invalid pdf_url
   - Test pagination and filtering

### Property-Based Tests

Property-based tests will verify universal properties across many generated inputs. Each test will run a minimum of 100 iterations with randomized inputs.

1. **Property Test 1: S3 Key Extraction Correctness**
   - Generate random valid S3 URLs with various formats
   - Verify extracted key matches expected pattern
   - **Feature: s3-signed-url-fix, Property 1: S3 Key Extraction Correctness**

2. **Property Test 2: Invalid URL Handling**
   - Generate random invalid URLs
   - Verify function returns null or throws error
   - **Feature: s3-signed-url-fix, Property 2: Invalid URL Handling**

3. **Property Test 3: Pre-signed URL Structure**
   - Generate random valid S3 keys and expiration times
   - Verify all required parameters are present in generated URL
   - **Feature: s3-signed-url-fix, Property 3: Pre-signed URL Structure**

4. **Property Test 4: Correct Key Usage**
   - Generate random book records with various field combinations
   - Verify correct key selection logic
   - **Feature: s3-signed-url-fix, Property 4: Correct Key Usage**

5. **Property Test 5: Data Integrity**
   - Generate random book records with both fields
   - Verify extracted key matches stored key
   - **Feature: s3-signed-url-fix, Property 5: Data Integrity**

6. **Property Test 6: Error Handling and Logging**
   - Generate random error conditions
   - Verify proper logging and safe error messages
   - **Feature: s3-signed-url-fix, Property 6: Error Handling and Logging**

7. **Property Test 7: Graceful Degradation**
   - Test with S3 not configured
   - Verify appropriate error responses
   - **Feature: s3-signed-url-fix, Property 7: Graceful Degradation**

### Testing Framework

We will use **Jest** as the testing framework with **fast-check** for property-based testing:

```javascript
// Example property test structure
import fc from 'fast-check';

describe('S3 Key Extraction', () => {
  it('should extract correct key from any valid S3 URL', () => {
    fc.assert(
      fc.property(
        fc.string(), // bucket name
        fc.string(), // region
        fc.array(fc.string()), // path segments
        (bucket, region, pathSegments) => {
          const key = pathSegments.join('/');
          const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          const extracted = extractS3Key(url);
          return extracted === key;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Goals

- Unit test coverage: >90% for new/modified code
- Property test coverage: All 7 correctness properties
- Integration test coverage: All API endpoints affected by changes

