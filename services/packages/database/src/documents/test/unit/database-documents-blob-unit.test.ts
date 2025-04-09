import { analytics } from 'service-utils/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteBlob,
  downloadBlob,
  uploadBlob,
} from '../../database-documents-blob';

vi.mock('aws4fetch', () => {
  return {
    AwsClient: vi.fn().mockImplementation(() => {
      return {
        fetch: vi.fn(),
      };
    }),
  };
});

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    },
  };
});

vi.mock('service-utils/environment', () => {
  return {
    environment: {
      BLOB_ACCESS_KEY_ID: 'test-key',
      BLOB_SECRET_KEY: 'test-secret',
      BLOB_URL: 'https://test-bucket.s3.amazonaws.com',
      NODE_ENV: 'test',
    },
  };
});

vi.mock('service-utils/logger', () => {
  return {
    getContextLogger: vi.fn().mockReturnValue({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadBlob', () => {
  it('should return false on upload failure and capture exception', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Upload failed'));
    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await uploadBlob({
      data: Buffer.from('test data'),
      documentID: 'test-doc',
      mimeType: 'text/plain',
      ownerID: 'test-owner',
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-doc'),
      expect.objectContaining({
        method: 'PUT',
      }),
    );
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      'test-owner',
    );
  });

  it('should return false when response status is an error (response.ok is false)', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue('Access denied'),
    };

    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await uploadBlob({
      data: Buffer.from('test data'),
      documentID: 'test-doc',
      mimeType: 'text/plain',
      ownerID: 'test-owner',
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-doc'),
      expect.objectContaining({
        method: 'PUT',
      }),
    );
    expect(mockResponse.text).toHaveBeenCalled();
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('403'),
      }),
      'test-owner',
    );
  });
});

describe('downloadBlob', () => {
  it('should return undefined on download failure and capture exception', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Download failed'));

    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await downloadBlob({
      documentID: 'test-doc',
      ownerID: 'test-owner',
    });

    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('test-doc'));
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      'test-owner',
    );
  });

  it('should return undefined when response status is an error (response.ok is false)', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue('Access denied'),
    };

    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await downloadBlob({
      documentID: 'test-doc',
      ownerID: 'test-owner',
    });

    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('test-doc'));
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('403'),
      }),
      'test-owner',
    );
  });
});

describe('deleteBlob', () => {
  it('should return false on delete failure and capture exception', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Delete failed'));

    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await deleteBlob({
      documentID: 'test-doc',
      ownerID: 'test-owner',
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-doc'),
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      'test-owner',
    );
  });

  it('should return false when response status is an error but not 404 (response.ok is false)', async () => {
    const { AwsClient } = await import('aws4fetch');
    const mockResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue('Access denied'),
    };

    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    // @ts-expect-error -- don't care
    AwsClient.mockImplementation(() => {
      return {
        fetch: mockFetch,
      };
    });

    const result = await deleteBlob({
      documentID: 'test-doc',
      ownerID: 'test-owner',
    });

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('test-doc'),
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    expect(mockResponse.text).toHaveBeenCalled();
    expect(analytics.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('403'),
      }),
      'test-owner',
    );
  });
});
