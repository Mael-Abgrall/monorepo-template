import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { embedDocumentChunks, embedQuery } from '../../ai-providers-embeddings';

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
vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});
const bedrockClient = await import('@aws-sdk/client-bedrock-runtime');

const testQuery = 'test query';
const testChunks = ['test', 'document'];
const mockError = new Error('Mock AWS Bedrock error');

beforeAll(() => {
  setEnvironment({ env: process.env as unknown as Environment });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('embedQuery', () => {
  test('on error, will throw and capture an exception', async () => {
    vi.mocked(
      new bedrockClient.BedrockRuntimeClient().send,
    ).mockRejectedValueOnce(mockError);

    await expect(
      embedQuery({
        query: testQuery,
        traceID: crypto.randomUUID(),
        userID: crypto.randomUUID(),
      }),
    ).rejects.toThrow();

    expect(analytics.capture).not.toHaveBeenCalled();
    expect(analytics.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('embedDocumentChunks', () => {
  test('on error, will throw and capture an exception', async () => {
    vi.mocked(
      new bedrockClient.BedrockRuntimeClient().send,
    ).mockRejectedValueOnce(mockError);

    await expect(
      embedDocumentChunks({
        chunks: testChunks,
        traceID: crypto.randomUUID(),
        userID: crypto.randomUUID(),
      }),
    ).rejects.toThrow();

    expect(analytics.capture).not.toHaveBeenCalled();
    expect(analytics.captureException).toHaveBeenCalledTimes(1);
  });
});
