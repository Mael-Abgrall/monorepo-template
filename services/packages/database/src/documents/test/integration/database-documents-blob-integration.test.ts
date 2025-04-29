import type { Environment } from 'service-utils/environment';
import { environment, setEnvironment } from 'service-utils/environment';
import { sleep } from 'shared/time';
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
  getSignedURL,
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

const documentID = 'test-document';
const userID = 'test-owner';

/**
 * Cleanup the test bucket
 */
async function cleanup(): Promise<void> {
  await deleteBlob({
    documentID,
    userID,
  });
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

    expect(downloadResult).toBeDefined();
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
    const mimeType = 'text/plain';

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

    expect(downloadResult).toBeDefined();
    expect(downloadResult.data.toString()).toBe('test content');

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

describe('signed URLs', () => {
  it('should generate a valid signed URL that can download the blob', async () => {
    const testData = Buffer.from('test content for signed URL');
    const mimeType = 'text/plain';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID,
    });
    expect(uploadResult).toBe(true);

    const signedURL = await getSignedURL({
      documentID,
      expiresInSeconds: 60,
      userID,
    });
    expect(signedURL).toBeDefined();
    expect(typeof signedURL).toBe('string');
    expect(signedURL.length).toBeGreaterThan(10);

    expect(signedURL).toContain(environment.BLOB_URL);
    expect(signedURL).toContain(documentID);
    expect(signedURL).toContain('X-Amz-Signature=');
    expect(signedURL).toContain('X-Amz-Expires=60');

    const response = await fetch(signedURL);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe('test content for signed URL');
  }, 30_000);

  it('should generate URLs with different expiration times', async () => {
    const testData = Buffer.from('expiration test content');
    const mimeType = 'text/plain';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID,
    });
    expect(uploadResult).toBe(true);

    const shortLivedURL = await getSignedURL({
      documentID,
      expiresInSeconds: 30,
      userID,
    });

    const longLivedURL = await getSignedURL({
      documentID,
      expiresInSeconds: 3600,
      userID,
    });

    expect(shortLivedURL).toContain('X-Amz-Expires=30');
    expect(longLivedURL).toContain('X-Amz-Expires=3600');

    const shortResponse = await fetch(shortLivedURL);
    expect(shortResponse.status).toBe(200);

    const longResponse = await fetch(longLivedURL);
    expect(longResponse.status).toBe(200);
  }, 30_000);

  it('when expired the signed URL should no longer work', async () => {
    const testData = Buffer.from('expiration test content');
    const mimeType = 'text/plain';

    const uploadResult = await uploadBlob({
      data: testData,
      documentID,
      mimeType,
      userID,
    });
    expect(uploadResult).toBe(true);

    const shortLivedURL = await getSignedURL({
      documentID,
      expiresInSeconds: 1,
      userID,
    });

    const response = await fetch(shortLivedURL);
    expect(response.status).toBe(200);

    await sleep(1000);

    const expiredResponse = await fetch(shortLivedURL);
    expect(expiredResponse.status).toBe(403);
  }, 30_000);

  it('should not be a update or delete url', async () => {
    const testData = Buffer.from('expiration test content');
    const mimeType = 'text/plain';

    const shortLivedURL = await getSignedURL({
      documentID,
      expiresInSeconds: 60,
      userID,
    });

    const response = await fetch(shortLivedURL, {
      body: testData,
      headers: {
        'Content-Type': mimeType,
      },
      method: 'PUT',
    });
    expect(response.status).toBe(403);

    const deleteResponse = await fetch(shortLivedURL, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(403);
  }, 30_000);
});
