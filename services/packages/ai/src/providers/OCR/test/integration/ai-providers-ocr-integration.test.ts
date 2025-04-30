import type { Environment } from 'service-utils/environment';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  deleteBlob,
  getSignedURL,
  uploadBlob,
} from '../../../../../../database/src/documents/database-documents-blob';
import { runOCR } from '../../ai-providers-ocr';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

const userID = 'OCR-test-user';

const documentID = 'sample.pdf';
const testPDF = await readFile(
  path.join(import.meta.dirname, 'sampleFiles', documentID),
);

const documentIDWord = 'sample.docx';
const testWord = await readFile(
  path.join(import.meta.dirname, 'sampleFiles', documentIDWord),
);

describe.skipIf(!process.env.TEST_API)('OCR', () => {
  beforeAll(async () => {
    setEnvironment({
      env: process.env as unknown as Environment,
    });

    const successPDF = await uploadBlob({
      data: testPDF,
      documentID,
      mimeType: 'application/pdf',
      userID,
    });
    if (!successPDF) {
      throw new Error('could not upload test document to bucket');
    }

    const successWord = await uploadBlob({
      data: testWord,
      documentID: documentIDWord,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      userID,
    });
    if (!successWord) {
      throw new Error('could not upload test document to bucket');
    }
  });

  afterAll(async () => {
    await deleteBlob({
      documentID,
      userID,
    });

    await deleteBlob({
      documentID: documentIDWord,
      userID,
    });
  });

  it('should run on pdf', async () => {
    const signedURL = await getSignedURL({
      documentID,
      expiresInSeconds: undefined,
      userID,
    });

    const { images, text } = await runOCR({
      documentURL: signedURL,
      model: 'mistral-ocr',
      traceID: 'traceID',
      userID,
    });
    expect(images.length).toBe(2);
    expect(text.length).toBe(3);
    console.log('pdf', text);

    expect(analytics.capture).toHaveBeenCalledTimes(1);
  });

  it('should run on docx', async () => {
    const signedURL = await getSignedURL({
      documentID: documentIDWord,
      expiresInSeconds: undefined,
      userID,
    });

    const { images, text } = await runOCR({
      documentURL: signedURL,
      model: 'mistral-ocr',
      traceID: 'traceID',
      userID,
    });
    console.log('docx', text);
    expect(images.length).toBe(2);
    expect(text.length).toBe(1);
  });
});
