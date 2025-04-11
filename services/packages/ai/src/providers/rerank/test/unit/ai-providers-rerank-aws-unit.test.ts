import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rerankCohere } from '../../ai-provider-rerank-aws';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = vi.fn();
  const mockClient = {
    send: mockSend,
  };
  return {
    BedrockRuntimeClient: vi.fn(() => {
      return mockClient;
    }),
    InvokeModelCommand: vi.fn(),
  };
});
const bedrockClient = await import('@aws-sdk/client-bedrock-runtime');

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

beforeAll(() => {
  setEnvironment({ env: process.env as unknown as Environment });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('rerankCohere', () => {
  it('should return keywordResults if vectorResults is empty', async () => {
    const keywordResults = [
      {
        chunkContent: 'test content',
        chunkID: 'chunk1',
        documentID: 'doc1',
        score: 0.8,
      },
    ];
    const result = await rerankCohere({
      keywordResults,
      maxResults: 10,
      query: 'test query',
      traceID: 'trace1',
      userID: 'user1',
      vectorResults: [],
    });

    expect(result).toEqual(keywordResults);

    expect(bedrockClient.BedrockRuntimeClient).not.toHaveBeenCalled();
  });

  it('should return vectorResults if keywordResults is empty', async () => {
    const vectorResults = [
      {
        chunkContent: 'test content',
        chunkID: 'chunk1',
        documentID: 'doc1',
        score: 0.8,
      },
    ];
    const result = await rerankCohere({
      keywordResults: [],
      maxResults: 10,
      query: 'test query',
      traceID: 'trace1',
      userID: 'user1',
      vectorResults,
    });

    expect(result).toEqual(vectorResults);

    expect(bedrockClient.BedrockRuntimeClient).not.toHaveBeenCalled();
  });

  it('should throw error if both keywordResults and vectorResults are empty', async () => {
    await expect(
      rerankCohere({
        keywordResults: [],
        maxResults: 10,
        query: 'test query',
        traceID: 'trace1',
        userID: 'user1',
        vectorResults: [],
      }),
    ).rejects.toThrow('No results to rerank');
  });

  it('should handle AWS Bedrock errors properly', async () => {
    const mockError = new Error('AWS Bedrock error');

    vi.mocked(
      new bedrockClient.BedrockRuntimeClient().send,
    ).mockRejectedValueOnce(mockError);

    const keywordResults = [
      {
        chunkContent: 'keyword content',
        chunkID: 'chunk1',
        documentID: 'doc1',
        score: 0.8,
      },
    ];

    const vectorResults = [
      {
        chunkContent: 'vector content',
        chunkID: 'chunk2',
        documentID: 'doc2',
        score: 0.7,
      },
    ];

    await expect(
      rerankCohere({
        keywordResults,
        maxResults: 10,
        query: 'test query',
        traceID: 'trace1',
        userID: 'user1',
        vectorResults,
      }),
    ).rejects.toThrow('AWS Bedrock error');

    expect(analytics.captureException).toHaveBeenCalled();
  });
});
