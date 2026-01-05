/**
 * Unit tests for BookController._addFileUrlsToBook() method
 * Tests cover image and PDF signed URL generation
 */

// Mock database before importing controller
jest.mock('../../config/database.js', () => ({
  __esModule: true,
  default: {}
}));

// Mock models
jest.mock('../../models/index.js', () => ({
  Book: {},
  College: {},
  User: {},
  BookAccessLog: {},
  Order: {}
}));

// Mock file upload service
jest.mock('../../services/fileUploadService.js', () => ({
  __esModule: true,
  default: {}
}));

import bookController from '../bookController.js';
import { generateSignedUrl, extractS3Key } from '../../config/aws.js';

// Mock the AWS functions
jest.mock('../../config/aws.js', () => ({
  generateSignedUrl: jest.fn(),
  extractS3Key: jest.fn()
}));

describe('BookController._addFileUrlsToBook() - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    generateSignedUrl.mockImplementation((key) => `https://signed-url.com/${key}?signature=abc123`);
    extractS3Key.mockImplementation((url) => {
      if (!url) return null;
      const match = url.match(/amazonaws\.com\/(.+)$/);
      return match ? match[1] : null;
    });
  });

  describe('Books with both PDF and cover', () => {
    test('should generate signed URLs for both PDF and cover image', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-123',
          name: 'Test Book',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/book-123/file.pdf',
          cover_image_url: 'https://bucket.s3.amazonaws.com/books/covers/book-123/cover.jpg'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeDefined();
      expect(result.cover_image_access_url).toBeDefined();
      expect(result.pdf_url).toBeUndefined();
      expect(result.cover_image_url).toBeUndefined();
      expect(generateSignedUrl).toHaveBeenCalledTimes(2);
    });

    test('should contain signature parameters in signed URLs', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-456',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf',
          cover_image_url: 'https://bucket.s3.amazonaws.com/books/covers/test.jpg'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toContain('signature=');
      expect(result.cover_image_access_url).toContain('signature=');
    });
  });

  describe('Books with PDF but no cover', () => {
    test('should only generate PDF signed URL', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-789',
          name: 'Book Without Cover',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/book-789/file.pdf',
          cover_image_url: null
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeDefined();
      expect(result.cover_image_access_url).toBeUndefined();
      expect(result.pdf_url).toBeUndefined();
      expect(result.cover_image_url).toBeUndefined();
      expect(generateSignedUrl).toHaveBeenCalledTimes(1);
    });

    test('should handle undefined cover_image_url', () => {
      const mockBook = {
        get: () => ({
          id: 'book-101',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf'
          // cover_image_url is undefined
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeDefined();
      expect(result.cover_image_access_url).toBeUndefined();
    });
  });

  describe('Books with cover but no PDF', () => {
    test('should only generate cover image signed URL', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-202',
          name: 'Book Without PDF',
          pdf_url: null,
          cover_image_url: 'https://bucket.s3.amazonaws.com/books/covers/book-202/cover.jpg'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeUndefined();
      expect(result.cover_image_access_url).toBeDefined();
      expect(result.pdf_url).toBeUndefined();
      expect(result.cover_image_url).toBeUndefined();
      expect(generateSignedUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('Books with neither PDF nor cover', () => {
    test('should not generate any signed URLs', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-303',
          name: 'Book Without Files',
          pdf_url: null,
          cover_image_url: null
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeUndefined();
      expect(result.cover_image_access_url).toBeUndefined();
      expect(generateSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('Security - Direct URLs removed', () => {
    test('should remove direct pdf_url from response', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-404',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_url).toBeUndefined();
      expect(result.pdf_access_url).toBeDefined();
    });

    test('should remove direct cover_image_url from response', () => {
      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-505',
          cover_image_url: 'https://bucket.s3.amazonaws.com/books/covers/test.jpg'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.cover_image_url).toBeUndefined();
      expect(result.cover_image_access_url).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('should handle extractS3Key failure gracefully for cover image', () => {
      extractS3Key.mockReturnValueOnce('books/pdfs/test.pdf').mockReturnValueOnce(null);

      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-606',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf',
          cover_image_url: 'invalid-url'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeDefined();
      expect(result.cover_image_access_url).toBeUndefined();
      expect(result.cover_image_url).toBeUndefined();
    });

    test('should handle generateSignedUrl exception for cover image', () => {
      extractS3Key.mockReturnValue('books/covers/test.jpg');
      generateSignedUrl.mockImplementationOnce(() => 'https://signed-pdf.com')
        .mockImplementationOnce(() => {
          throw new Error('S3 signing failed');
        });

      const mockBook = {
        toSafeJSON: () => ({
          id: 'book-707',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf',
          cover_image_url: 'https://bucket.s3.amazonaws.com/books/covers/test.jpg'
        })
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(result.pdf_access_url).toBeDefined();
      expect(result.cover_image_access_url).toBeUndefined();
      expect(result.cover_image_url).toBeUndefined();
    });
  });

  describe('Book model compatibility', () => {
    test('should work with toSafeJSON() method', () => {
      const mockBook = {
        toSafeJSON: jest.fn(() => ({
          id: 'book-808',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf'
        }))
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(mockBook.toSafeJSON).toHaveBeenCalled();
      expect(result.pdf_access_url).toBeDefined();
    });

    test('should work with get() method', () => {
      const mockBook = {
        get: jest.fn(() => ({
          id: 'book-909',
          pdf_url: 'https://bucket.s3.amazonaws.com/books/pdfs/test.pdf'
        }))
      };

      const result = bookController._addFileUrlsToBook(mockBook);

      expect(mockBook.get).toHaveBeenCalled();
      expect(result.pdf_access_url).toBeDefined();
    });
  });
});
