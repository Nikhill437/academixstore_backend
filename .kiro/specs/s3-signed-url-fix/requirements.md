# Requirements Document

## Introduction

This specification addresses the S3 Access Denied error that occurs when users attempt to access purchased book PDFs through pre-signed URLs. The current implementation incorrectly extracts S3 keys from stored URLs, resulting in invalid pre-signed URLs that fail with Access Denied errors.

## Glossary

- **S3_Service**: AWS S3 cloud storage service for storing book PDFs
- **Pre-signed_URL**: A temporary URL with embedded AWS credentials that grants time-limited access to private S3 objects
- **S3_Key**: The full path identifier for an object within an S3 bucket (e.g., "c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf")
- **Book_PDF**: The PDF file of a purchased book stored in S3
- **Order_System**: The system that manages book purchases and provides access to purchased content

## Requirements

### Requirement 1: Extract S3 Keys from URLs

**User Story:** As a system, I want to correctly extract S3 keys from stored URLs, so that I can generate valid pre-signed URLs for book access.

#### Acceptance Criteria

1. WHEN a full S3 URL is provided, THE S3_Service SHALL extract the complete S3 key from the URL path
2. WHEN the URL contains a bucket name in the hostname, THE S3_Service SHALL remove the bucket name and region from the path
3. WHEN the URL contains query parameters or fragments, THE S3_Service SHALL exclude them from the extracted key
4. THE S3_Service SHALL handle both path-style and virtual-hosted-style S3 URLs correctly
5. WHEN an invalid URL format is provided, THE S3_Service SHALL return null or throw a descriptive error

### Requirement 2: Generate Valid Pre-signed URLs

**User Story:** As a user, I want to access my purchased book PDFs through secure URLs, so that I can read the books I've paid for.

#### Acceptance Criteria

1. WHEN a user requests their purchased books, THE Order_System SHALL generate valid pre-signed URLs for each book's PDF
2. WHEN generating a pre-signed URL, THE S3_Service SHALL use the correct S3 key extracted from the stored URL
3. THE Pre-signed_URL SHALL grant access for a configurable duration (default 1 hour)
4. WHEN the S3 key is invalid or missing, THE Order_System SHALL handle the error gracefully and log the issue
5. THE Pre-signed_URL SHALL include proper AWS signature parameters (Algorithm, Credential, Date, Expires, Signature, SignedHeaders)

### Requirement 3: Store S3 Keys Consistently

**User Story:** As a developer, I want S3 keys to be stored consistently in the database, so that URL generation is reliable and maintainable.

#### Acceptance Criteria

1. WHEN a book PDF is uploaded, THE S3_Service SHALL store the S3 key in a dedicated database field
2. THE S3_Service SHALL store the full S3 URL in the pdf_url field for backward compatibility
3. WHEN both S3 key and URL are available, THE Order_System SHALL prefer using the stored S3 key for generating pre-signed URLs
4. WHEN only the URL is available, THE Order_System SHALL extract the S3 key using the extraction utility
5. THE Book_PDF SHALL maintain data integrity between the stored key and URL fields

### Requirement 4: Handle S3 Access Errors

**User Story:** As a system administrator, I want clear error messages when S3 access fails, so that I can quickly diagnose and fix issues.

#### Acceptance Criteria

1. WHEN S3 credentials are invalid, THE S3_Service SHALL return a descriptive error message
2. WHEN an S3 object does not exist, THE S3_Service SHALL return a "not found" error
3. WHEN S3 bucket permissions are insufficient, THE S3_Service SHALL return an "access denied" error with details
4. WHEN pre-signed URL generation fails, THE Order_System SHALL log the error with the book ID and S3 key
5. THE Order_System SHALL return a user-friendly error message without exposing sensitive AWS details

### Requirement 5: Validate S3 Configuration

**User Story:** As a developer, I want to validate S3 configuration at startup, so that I can detect configuration issues early.

#### Acceptance Criteria

1. WHEN the application starts, THE S3_Service SHALL verify that all required AWS credentials are present
2. WHEN the application starts, THE S3_Service SHALL test connectivity to the configured S3 bucket
3. WHEN S3 configuration is invalid, THE S3_Service SHALL log a warning but allow the application to start
4. THE S3_Service SHALL provide a health check endpoint that verifies S3 connectivity
5. WHEN S3 is not configured, THE Order_System SHALL return appropriate error messages for PDF access requests
