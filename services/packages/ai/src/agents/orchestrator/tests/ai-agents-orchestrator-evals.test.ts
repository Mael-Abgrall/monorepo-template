import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModelMessage } from '../../../providers/lm/interfaces';
import { agentOrchestrator } from '../ai-agents-orchestrator';

vi.mock('service-utils/analytics', () => {
  return {
    analytics: { capture: vi.fn(), captureException: vi.fn() },
  };
});

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe.skipIf(!process.env.TEST_EVAL)(
  'agentOrchestrator',
  () => {
    it('should request to list documents, and the summarizer', async () => {
      const messages: LanguageModelMessage[] = [
        {
          content: [
            {
              text: 'Can you summarize the meeting minutes?',
            },
          ],
          role: 'user',
        },
      ];

      const response = await agentOrchestrator({
        messages,
        spaceID: 'test-spaceID',
        traceID: 'test-traceID',
        userID: 'test-userID',
      });

      if (
        response.responseMessage.content?.[1].toolUse?.name !== 'list_documents'
      ) {
        for (const message of response.responseMessage.content!) {
          console.log(message);
        }
      }

      expect(response.stopReason).toBe('tool_use');
      expect(response.responseMessage.content).toHaveLength(2);
      expect(response.responseMessage.content?.[1].toolUse?.name).toBe(
        'list_documents',
      );

      messages.push(response.responseMessage, {
        content: [
          {
            toolResult: {
              content: [
                {
                  json: {
                    documents: [
                      { documentID: 'test-documentID', title: 'minutes.docx' },
                    ],
                  },
                },
              ],
              toolUseId:
                response.responseMessage.content?.[1].toolUse?.toolUseId,
            },
          },
        ],
        role: 'user',
      });
      const secondResponse = await agentOrchestrator({
        messages,
        spaceID: 'test-spaceID',
        traceID: 'test-traceID',
        userID: 'test-userID',
      });

      expect(secondResponse.stopReason).toBe('tool_use');
      expect(secondResponse.responseMessage.content).toHaveLength(2);
      expect(secondResponse.responseMessage.content?.[1].toolUse?.name).toBe(
        'read_document',
      );
      expect(
        // @ts-expect-error It should be there, or tests will fail
        secondResponse.responseMessage.content?.[1].toolUse?.input?.documentID,
      ).toBe('test-documentID');
      expect(
        // @ts-expect-error It should be there, or tests will fail
        secondResponse.responseMessage.content?.[1].toolUse?.input?.request,
      ).toContain('summar');

      messages.push(secondResponse.responseMessage, {
        content: [
          {
            toolResult: {
              content: [
                {
                  json: {
                    summary:
                      'Will is on holidays, John is doing user interviews and Natt has two discovery calls.',
                  },
                },
              ],
              toolUseId:
                secondResponse.responseMessage.content?.[1].toolUse?.toolUseId,
            },
          },
        ],
        role: 'user',
      });
      const thirdResponse = await agentOrchestrator({
        messages,
        spaceID: 'test-spaceID',
        traceID: 'test-traceID',
        userID: 'test-userID',
      });

      expect(thirdResponse.stopReason).toBe('tool_use');
      expect(thirdResponse.responseMessage.content).toHaveLength(2);
      expect(thirdResponse.responseMessage.content?.[1].toolUse?.name).toBe(
        'finalize_answer',
      );
    });

    // todo
    // it('Should stop when the information is not available')
  },
  50_000,
);
