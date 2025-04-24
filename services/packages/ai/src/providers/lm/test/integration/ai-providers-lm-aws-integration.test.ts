import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { complete, completeStream } from '../../ai-providers-lm';

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
      const messages: Message[] = [
        {
          content: [{ text: 'Who are you?' }],
          role: 'user',
        },
      ];

      const llmStream = completeStream({
        messages,
        model: 'claude-3-7-sonnet',
        systemPrompt: undefined,
        tools: undefined,
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

    it('should return a stream using Claude 3.5 Sonnet', async () => {
      const messages: Message[] = [
        {
          content: [{ text: 'Who are you?' }],
          role: 'user',
        },
      ];

      const llmStream = completeStream({
        messages,
        model: 'claude-3-5-sonnet',
        systemPrompt: undefined,
        tools: undefined,
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

    // todo
    // it('tests for improved streaming for UX with buffers', async () => {
    //   const messages: Message[] = [
    //     {
    //       content: [
    //         {
    //           text: 'This is an integration test, please call the tool "call_me" with the query "how many blocks are there" for the location "new york" and sort to "true"',
    //         },
    //       ],
    //       role: 'user',
    //     },
    //   ];

    //   const llmStream = await bedrockCompleteStreamToBuffer({
    //     messages,
    //     model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    //     systemPrompt: undefined,
    //     tools: [
    //       {
    //         toolSpec: {
    //           description: 'This is a dummy tool for tests, please call me',
    //           inputSchema: {
    //             json: Type.Object({
    //               location: Type.String({
    //                 description: 'The city name (eg: New York)',
    //               }),
    //               query: Type.String({ description: 'The query to search' }),
    //               sort: Type.Boolean({
    //                 description: 'Whether to sort the results by name or not',
    //               }),
    //             }),
    //           },
    //           name: 'call_me',
    //         },
    //       },
    //     ],
    //     traceID: 'test-trace-stream',
    //     userID: 'test-user-id',
    //   });

    //   expect(llmStream).toBeDefined();
    //   console.log(llmStream);
    //   console.log(llmStream.responseMessage.content);
    //   // for await (const chunk of llmStream) {
    //   //   expect(chunk).toBeDefined();
    //   //   expect(typeof chunk).toBe('string');
    //   // }
    //   expect(analytics.capture).toHaveBeenCalledOnce();
    //   expect(analytics.captureException).not.toHaveBeenCalled();
    // });
  },
  50_000,
);

describe.skipIf(!process.env.TEST_API)('complete', () => {
  describe('Claude 3.7 Sonnet', () => {
    it('should return a text using Claude 3.7 Sonnet', async () => {
      const messages: Message[] = [
        {
          content: [{ text: 'Who are you?' }],
          role: 'user',
        },
      ];
      const response = await complete({
        messages,
        model: 'claude-3-7-sonnet',
        systemPrompt: undefined,
        tools: undefined,
        traceID: 'test-trace',
        userID: 'test-user-id',
      });

      expect(response.responseMessage).toBeDefined();
      expect(typeof response.responseMessage).toBe('object');
      expect(response.stopReason).toBeDefined();
      expect(response.stopReason).toBe('end_turn');
      expect(analytics.capture).toHaveBeenCalledOnce();
      expect(analytics.captureException).not.toHaveBeenCalled();
    });
  }, 50_000);
  describe('Claude 3.5 Sonnet', () => {
    it('should return a text using Claude 3.5 Sonnet', async () => {
      const messages: Message[] = [
        {
          content: [{ text: 'Who are you?' }],
          role: 'user',
        },
      ];
      const response = await complete({
        messages,
        model: 'claude-3-5-sonnet',
        systemPrompt: undefined,
        tools: undefined,
        traceID: 'test-trace',
        userID: 'test-user-id',
      });
      expect(response.responseMessage).toBeDefined();
      expect(typeof response.responseMessage).toBe('object');
      expect(response.stopReason).toBeDefined();
      expect(response.stopReason).toBe('end_turn');
      expect(analytics.capture).toHaveBeenCalledOnce();
      expect(analytics.captureException).not.toHaveBeenCalled();
    });
  }, 50_000);
});
