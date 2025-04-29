import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { embedDocumentChunks, embedQuery } from '../../ai-providers-embeddings';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

const testQuery = 'test query';
const testChunks = ['test', 'document'];

describe.skipIf(!process.env.TEST_API)('Cohere embedding model', async () => {
  beforeAll(() => {
    setEnvironment({ env: process.env as unknown as Environment });
  });

  describe('embedQuery', () => {
    test('embedQuery will embed a query and report analytics', async () => {
      const response = await embedQuery({
        query: testQuery,
        traceID: crypto.randomUUID(),
        userID: crypto.randomUUID(),
      });
      expect(response).toBeDefined();
      expect(response.length).toBe(1024);
      expect(analytics.capture).toHaveBeenCalledTimes(1);
    });

    test('embedQuery will throw an error if the query is too large', async () => {
      await expect(
        embedQuery({
          query: 'a'.repeat(10_000),
          traceID: crypto.randomUUID(),
          userID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();
      expect(analytics.capture).not.toHaveBeenCalled();
    });
  });

  describe('embedDocumentChunks', () => {
    test('embedDocumentChunks will embed a document', async () => {
      const response = await embedDocumentChunks({
        chunks: testChunks,
        traceID: crypto.randomUUID(),
        userID: crypto.randomUUID(),
      });
      expect(response).toBeDefined();
      expect(response.length).toBe(testChunks.length);
      expect(response[0].embedding.length).toBe(1024);
      expect(response[0].chunkContent).toBe(testChunks[0]);
      expect(response[1].chunkContent).toBe(testChunks[1]);
      expect(analytics.capture).toHaveBeenCalledTimes(1);
    });

    test('embedDocumentChunks will throw an error if any of the chunks are too large', async () => {
      await expect(
        embedDocumentChunks({
          chunks: ['a'.repeat(10_000), 'b'.repeat(10_000)],
          traceID: crypto.randomUUID(),
          userID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();

      await expect(
        embedDocumentChunks({
          chunks: ['test', 'b'.repeat(10_000)],
          traceID: crypto.randomUUID(),
          userID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();

      await expect(
        embedDocumentChunks({
          chunks: ['a'.repeat(10_000), 'test'],
          traceID: crypto.randomUUID(),
          userID: crypto.randomUUID(),
        }),
      ).rejects.toThrow();

      expect(analytics.capture).not.toHaveBeenCalled();
    });
  });
});
