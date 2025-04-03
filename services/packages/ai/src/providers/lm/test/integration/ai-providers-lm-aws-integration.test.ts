import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { claude37SonnetStream } from '../../ai-providers-lm-aws';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi
        .fn()
        .mockResolvedValue(
          undefined satisfies ReturnType<typeof analytics.capture>,
        ),
      captureException: vi
        .fn()
        .mockResolvedValue(
          undefined satisfies ReturnType<typeof analytics.captureException>,
        ),
    },
  };
});

beforeAll(async () => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skipIf(!process.env.TEST_API)(
  'claude37SonnetStream',
  () => {
    it('should return a stream', async () => {
      const llmStream = claude37SonnetStream({
        prompt: 'Who are you?',
        traceID: 'test-trace-stream',
        userID: 'test-user-id',
      });
      expect(llmStream).toBeDefined();
      for await (const chunk of llmStream) {
        expect(chunk).toBeDefined();
        expect(typeof chunk).toBe('string');
      }
      expect(analytics.capture).toHaveBeenCalledOnce();
      expect(analytics.captureException).not.toHaveBeenCalled();
    });
  },
  50_000,
);
