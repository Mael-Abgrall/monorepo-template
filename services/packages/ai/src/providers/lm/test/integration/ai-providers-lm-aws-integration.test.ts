import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeStream } from '../../ai-providers-lm';

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
  'completeStream',
  () => {
    it('should return a stream using Claude 3.7 Sonnet', async () => {
      const messages = [
        {
          content: 'Who are you?',
          role: 'user' as const,
        },
      ];

      const llmStream = completeStream({
        messages,
        model: 'claude-3-7-sonnet',
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
