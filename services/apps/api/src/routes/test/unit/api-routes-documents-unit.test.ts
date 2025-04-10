import type { Environment } from 'service-utils/environment';
import {
  addDocument,
  getDocumentsBySpaceID,
  parseAndIndexDocument,
} from 'core/documents';
import { spaceExists } from 'core/space';
import { readFile } from 'node:fs/promises';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';
import { getSignedCookieCustom } from '../../../helpers/api-helpers-cookies';
import { verifyToken } from '../../../helpers/api-helpers-jwt';

vi.mock('core/documents', () => {
  return {
    addDocument: vi.fn(),
    getDocumentsBySpaceID: vi.fn(),
    parseAndIndexDocument: vi.fn(),
  };
});

vi.mock('core/space', () => {
  return {
    spaceExists: vi.fn(),
  };
});

vi.mock('../../../helpers/api-helpers-cookies');
vi.mock('../../../helpers/api-helpers-jwt');

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

const testFile = new File(
  [await readFile(`${import.meta.dirname}/testFile.txt`)],
  'testFile.txt',
);
const testDocx = new File(
  [await readFile(`${import.meta.dirname}/test.docx`)],
  'test.docx',
);

beforeEach(async () => {
  vi.resetAllMocks();
});

describe('POST /documents/upload', () => {
  it('should be protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );

    const response = await app.request('/documents/upload', {
      method: 'POST',
    });

    expect(response.status).toBe(401);
  });

  it('should successfully upload a file, and call the core', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(addDocument).mockResolvedValue({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'pendingIndexing',
      title: 'Test Document',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof addDocument>>);
    vi.mocked(spaceExists).mockResolvedValue(true);
    vi.mocked(parseAndIndexDocument).mockResolvedValue({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'indexed',
      title: 'Test Document',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof parseAndIndexDocument>>);

    const formData = new FormData();
    formData.append('spaceID', 'test-space-id');
    formData.append('file', testFile, 'testFile.txt');
    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'indexed',
      title: 'Test Document',
      userID: 'test-user-id',
    });
    expect(addDocument).toHaveBeenCalledOnce();
    expect(addDocument).toHaveBeenCalledWith({
      binaryStream: expect.any(Buffer),
      documentID: expect.any(String),
      mimeType: 'text/plain',
      spaceID: 'test-space-id',
      title: 'testFile.txt',
      userID: 'test-user-id',
    } satisfies Parameters<typeof addDocument>[0]);

    expect(parseAndIndexDocument).toHaveBeenCalledOnce();
  });

  it('should successfully upload a complex mime type', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(addDocument).mockResolvedValue({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'pendingIndexing',
      title: 'Test Document',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof addDocument>>);
    vi.mocked(spaceExists).mockResolvedValue(true);
    vi.mocked(parseAndIndexDocument).mockResolvedValue({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'indexed',
      title: 'Test Document',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof parseAndIndexDocument>>);

    const formData = new FormData();
    formData.append('spaceID', 'test-space-id');
    formData.append('file', testDocx, 'test.docx');
    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      documentID: '123',
      spaceID: 'test-space-id',
      status: 'indexed',
      title: 'Test Document',
      userID: 'test-user-id',
    });
    expect(addDocument).toHaveBeenCalledWith({
      binaryStream: expect.any(Buffer),
      documentID: expect.any(String),
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      spaceID: 'test-space-id',
      title: 'test.docx',
      userID: 'test-user-id',
    } satisfies Parameters<typeof addDocument>[0]);
  });

  it('should return 400 when no file is provided', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const formData = new FormData();
    formData.append('documentID', '123');

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });

  it('should return 415 when file type is not supported', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', testFile, 'test.shouldNotWork');

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(415);
  });

  it('should return 413 when file size exceeds maximum limit', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const largeContent = 'a'.repeat(101 * 1024 * 1024); // 101MB content
    const largeFile = new File([largeContent], 'largeFile.txt', {
      type: 'text/plain',
    });

    const formData = new FormData();
    formData.append('documentID', '123');
    formData.append('file', largeFile);

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(413);
  });

  it('should return 400 when no spaceID is provided', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const formData = new FormData();
    formData.append('file', testFile, 'testFile.txt');

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(400);
  });

  it('should return 422 when no space exists', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);
    vi.mocked(spaceExists).mockResolvedValue(false);

    const formData = new FormData();
    formData.append('spaceID', 'test-space-id');
    formData.append('file', testFile, 'testFile.txt');

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(422);
  });

  it('should throw an error 500 when there is an issue saving the document', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);
    vi.mocked(spaceExists).mockResolvedValue(true);
    vi.mocked(addDocument).mockResolvedValueOnce(undefined);

    const formData = new FormData();
    formData.append('spaceID', 'test-space-id');
    formData.append('file', testFile, 'testFile.txt');

    const response = await app.request('/documents/upload', {
      body: formData,
      method: 'POST',
    });

    expect(response.status).toBe(500);
  });
});

describe('GET /documents/list/:spaceID', () => {
  it('should be protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );

    const response = await app.request('/documents/list/test-space-id');

    expect(response.status).toBe(401);
  });

  it('should list documents for a space', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(getDocumentsBySpaceID).mockResolvedValueOnce([
      {
        documentID: '123',
        spaceID: 'test-space-id',
        status: 'pendingIndexing',
        title: 'Test Document',
        userID: 'test-user-id',
      },
    ] satisfies Awaited<ReturnType<typeof getDocumentsBySpaceID>>);

    const response = await app.request('/documents/list/test-space-id');

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual([
      {
        documentID: '123',
        spaceID: 'test-space-id',
        status: 'pendingIndexing',
        title: 'Test Document',
        userID: 'test-user-id',
      },
    ]);
  });

  it('should return 404 when spaceID is missing', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const response = await app.request('/documents/list/');

    expect(response.status).toBe(404);
  });
});
