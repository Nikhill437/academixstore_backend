/**
 * Unit tests for extractS3Key function
 * Tests various S3 URL formats and edge cases
 */

import { extractS3Key } from '../aws.js';

describe('extractS3Key - Unit Tests', () => {
  describe('Virtual-hosted-style URLs', () => {
    test('should extract key from standard virtual-hosted-style URL', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });

    test('should extract key from virtual-hosted-style URL with multiple path segments', () => {
      const url = 'https://academixstore.s3.ap-south-1.amazonaws.com/c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf');
    });

    test('should extract key from virtual-hosted-style URL with s3- prefix', () => {
      const url = 'https://mybucket.s3-us-west-2.amazonaws.com/path/to/file.jpg';
      const result = extractS3Key(url);
      expect(result).toBe('path/to/file.jpg');
    });

    test('should extract key from virtual-hosted-style URL with single file', () => {
      const url = 'https://mybucket.s3.eu-west-1.amazonaws.com/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('file.pdf');
    });
  });

  describe('Path-style URLs', () => {
    test('should extract key from path-style URL with region', () => {
      const url = 'https://s3.us-east-1.amazonaws.com/mybucket/folder/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });

    test('should extract key from legacy path-style URL', () => {
      const url = 'https://s3.amazonaws.com/mybucket/folder/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });

    test('should extract key from path-style URL with multiple segments', () => {
      const url = 'https://s3.ap-south-1.amazonaws.com/mybucket/a/b/c/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('a/b/c/file.pdf');
    });

    test('should extract key from path-style URL with single file', () => {
      const url = 'https://s3.us-west-2.amazonaws.com/mybucket/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('file.pdf');
    });
  });

  describe('URLs with query parameters', () => {
    test('should extract key and ignore query parameters', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf?versionId=abc123';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });

    test('should extract key from pre-signed URL with multiple query parameters', () => {
      const url = 'https://academixstore.s3.ap-south-1.amazonaws.com/c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAR74PMH34YN7BPI53%2F20251231%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20251231T082125Z&X-Amz-Expires=3600&X-Amz-Signature=7f395d934853e1afe1cafae08871f881bcf4ffcdd65ed20e5acc9adbdc878854&X-Amz-SignedHeaders=host';
      const result = extractS3Key(url);
      expect(result).toBe('c69b8b42-0b6d-4d5d-a4cd-a178a5ac3c3d/1767066588674-6f1b9c31.pdf');
    });

    test('should extract key from path-style URL with query parameters', () => {
      const url = 'https://s3.us-east-1.amazonaws.com/mybucket/folder/file.pdf?response-content-type=application/pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });
  });

  describe('URLs with fragments', () => {
    test('should extract key and ignore fragment', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf#section1';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });

    test('should extract key and ignore both query and fragment', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file.pdf?version=1#section1';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.pdf');
    });
  });

  describe('URL-encoded characters', () => {
    test('should decode URL-encoded characters in key', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder%20with%20spaces/file%20name.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder with spaces/file name.pdf');
    });

    test('should decode special characters', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file%2Bname%40test.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file+name@test.pdf');
    });

    test('should handle already decoded URLs', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file name.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file name.pdf');
    });
  });

  describe('Invalid URL formats', () => {
    test('should return null for null input', () => {
      const result = extractS3Key(null);
      expect(result).toBeNull();
    });

    test('should return null for undefined input', () => {
      const result = extractS3Key(undefined);
      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = extractS3Key('');
      expect(result).toBeNull();
    });

    test('should return null for non-string input', () => {
      const result = extractS3Key(123);
      expect(result).toBeNull();
    });

    test('should return null for invalid URL string', () => {
      const result = extractS3Key('not-a-valid-url');
      expect(result).toBeNull();
    });

    test('should return null for non-S3 URL', () => {
      const url = 'https://example.com/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBeNull();
    });

    test('should return null for S3 URL with no key (path-style)', () => {
      const url = 'https://s3.us-east-1.amazonaws.com/mybucket/';
      const result = extractS3Key(url);
      expect(result).toBeNull();
    });

    test('should return null for S3 URL with only bucket name (path-style)', () => {
      const url = 'https://s3.us-east-1.amazonaws.com/mybucket';
      const result = extractS3Key(url);
      expect(result).toBeNull();
    });

    test('should return null for virtual-hosted URL with no key', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/';
      const result = extractS3Key(url);
      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    test('should handle keys with dots', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/folder/file.backup.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('folder/file.backup.pdf');
    });

    test('should handle keys with hyphens', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/my-folder/my-file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('my-folder/my-file.pdf');
    });

    test('should handle keys with underscores', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/my_folder/my_file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('my_folder/my_file.pdf');
    });

    test('should handle very long keys', () => {
      const longKey = 'a/'.repeat(50) + 'file.pdf';
      const url = `https://mybucket.s3.us-east-1.amazonaws.com/${longKey}`;
      const result = extractS3Key(url);
      expect(result).toBe(longKey);
    });

    test('should handle keys with numbers', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/2024/01/15/file123.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('2024/01/15/file123.pdf');
    });

    test('should handle UUID-based keys', () => {
      const url = 'https://mybucket.s3.us-east-1.amazonaws.com/550e8400-e29b-41d4-a716-446655440000/file.pdf';
      const result = extractS3Key(url);
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000/file.pdf');
    });
  });
});
