import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { Environment } from 'service-utils/environment';
import { analytics } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
import { Type } from 'shared/typebox';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LanguageModelMessage,
  LanguageModelTool,
} from '../../ai-providers-lm';
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

describe.skipIf(!process.env.TEST_API)('complete', () => {
  describe('Claude 3.7 Sonnet', () => {
    // Todo: uncomment when the 409 errors are dealt with
    // it('should return a text using Claude 3.7 Sonnet', async () => {
    //   const messages: Message[] = [
    //     {
    //       content: [{ text: 'Who are you?' }],
    //       role: 'user',
    //     },
    //   ];

    //   const response = await complete({
    //     messages,
    //     model: 'claude-3-7-sonnet',
    //     tools: undefined,
    //     traceID: 'test-trace',
    //     userID: 'test-user-id',
    //   });

    //   expect(response.responseMessage).toBeDefined();
    //   expect(typeof response.responseMessage).toBe('object');
    //   expect(response.stopReason).toBeDefined();
    //   expect(response.stopReason).toBe('end_turn');
    //   expect(analytics.capture).toHaveBeenCalledOnce();
    //   expect(analytics.captureException).not.toHaveBeenCalled();
    // });

    it('should return a tool to call when needed, and respond with the retrieved data', async () => {
      const messages: LanguageModelMessage[] = [
        {
          content: [
            {
              text: 'This is a integration test, please use the provided tools and follow all the instructions given. Use New York as the test location, then tell me what is the weather given by the tool',
            },
          ],
          role: 'user',
        },
      ];

      // const tools: LanguageModelTool[] = [
      //   {
      //     description:
      //       'This function will give you real time weather information for a given city',
      //     inputSchema: {
      //       properties: {
      //         location: {
      //           description: 'The city name, e.g. San Francisco',
      //           type: 'string',
      //         },
      //       },
      //       required: ['location'],
      //       type: 'object',
      //     },
      //     name: 'get_weather',
      //   },
      // ];
      const tools: LanguageModelTool[] = [
        {
          description:
            'This function will give you real time weather information for a given city',
          inputSchema: Type.Object({
            location: Type.String({
              description: 'The city name, e.g. San Francisco',
            }),
          }),
          name: 'get_weather',
        },
      ];

      const response = await complete({
        messages,
        model: 'claude-3-7-sonnet',
        systemPrompt: undefined,
        tools,
        traceID: 'test-trace',
        userID: 'test-user-id',
      });

      messages.push(response.responseMessage);
      if (!response.responseMessage.content?.[1].toolUse?.name) {
        console.log(response.responseMessage.content);
        throw new Error('Tool name should be defined');
      }
      if (!response.responseMessage.content[1].toolUse.input) {
        console.log(response.responseMessage.content[1].toolUse);
        throw new Error('Tool input should be defined');
      }

      const followUpResponse = await complete({
        messages: [
          ...messages,
          {
            content: [
              {
                toolResult: {
                  content: [
                    {
                      json: {
                        weather:
                          'It is raining frogs (this is a hardcoded joke for tests)',
                      },
                    },
                  ],
                  toolUseId:
                    response.responseMessage.content[1].toolUse.toolUseId,
                },
              },
            ],
            role: 'user',
          },
        ],
        model: 'claude-3-7-sonnet',
        systemPrompt: undefined,
        tools,
        traceID: 'test-trace',
        userID: 'test-user-id',
      });
      expect(followUpResponse.responseMessage).toBeDefined();
      expect(followUpResponse.responseMessage.content?.at(-1)?.text).toContain(
        'frogs',
      );
    });
  }, 50_000);
});
