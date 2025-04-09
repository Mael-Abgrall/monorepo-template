import type { Environment } from 'service-utils/environment';
import { environment, setEnvironment } from 'service-utils/environment';
import { createStorage } from 'unstorage';
import s3Driver from 'unstorage/drivers/s3';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  deleteBlob,
  downloadBlob,
  uploadBlob,
} from '../../database-documents-blob';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    },
  };
});

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

/**
 * Cleanup the test bucket
 */
async function cleanup(): Promise<void> {
  const storage = createStorage<Buffer>({
    driver: s3Driver({
      accessKeyId: environment.BLOB_ACCESS_KEY_ID,
      bucket: 'test',
      endpoint: environment.BLOB_URL,
      region: 'auto',
      secretAccessKey: environment.BLOB_SECRET_KEY,
    }),
  });

  try {
    await storage.removeItem('test-document');
    await storage.removeItem('non-existent-document');
  } catch {
    // Ignore errors from removing non-existent files
  }
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe('upload/download', () => {
  it('should upload a file and set mime type, then download it successfully', async () => {
    const testData = Buffer.from('test content');
    const documentID = 'test-document';
    const mimeType = 'text/plain';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID: 'test-owner',
    });

    expect(uploadResult).toBe(true);

    const downloadResult = await downloadBlob({
      documentID,
      userID: 'test-owner',
    });

    expect(downloadResult).not.toBeUndefined();
    expect(downloadResult.data.toString()).toBe('test content');
    expect(downloadResult.mimeType).toBe(mimeType);
  }, 30_000);

  it('should throw when downloading a non-existent file', async () => {
    await expect(
      downloadBlob({
        documentID: 'non-existent-document',
        userID: 'test-owner',
      }),
    ).rejects.toThrow('Download failed with status: 404 Not Found');
  }, 10_000);

  it('Should not return another users document', async () => {
    const testData = Buffer.from('test content');
    const documentID = 'test-document';
    const mimeType = 'text/plain';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID: 'test-owner',
    });

    expect(uploadResult).toBe(true);

    await expect(
      downloadBlob({
        documentID,
        userID: 'other-owner',
      }),
    ).rejects.toThrow('Download failed with status: 404 Not Found');
  }, 10_000);
});

describe('delete', () => {
  it('should delete a blob and return true on success', async () => {
    const testData = Buffer.from('test content');
    const documentID = 'test-document';
    const mimeType = 'text/plain';
    const userID = 'test-owner';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID,
    });

    expect(uploadResult).toBe(true);

    const downloadResult = await downloadBlob({
      documentID,
      userID,
    });

    expect(downloadResult).not.toBeUndefined();

    await deleteBlob({
      documentID,
      userID,
    });

    await expect(
      downloadBlob({
        documentID,
        userID,
      }),
    ).rejects.toThrow('Download failed with status: 404 Not Found');
  }, 30_000);

  it('should return true when deleting a non-existent blob', async () => {
    const documentID = 'non-existent-document';
    const userID = 'test-owner';

    await expect(
      downloadBlob({
        documentID,
        userID,
      }),
    ).rejects.toThrow('Download failed with status: 404 Not Found');

    await deleteBlob({
      documentID,
      userID,
    });
  }, 10_000);
});
