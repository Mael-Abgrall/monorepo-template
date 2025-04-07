import type { Message } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('ai-providers-lm-aws.ts');

/**
 * Stream a response from the Claude 3.7 Sonnet model
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.traceID The trace ID to use for the request
 * @param root.userID The user ID to use for the request
 * @yields A stream of the text response from the model
 */
export async function* claude37SonnetStream({
  messages,
  traceID,
  userID,
}: {
  messages: Message[];
  traceID: string;
  userID: string;
}): AsyncGenerator<string> {
  const client = new BedrockRuntimeClient({
    credentials: {
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
    },
    region: 'eu-central-1',
  });

  const command = new ConverseStreamCommand({
    inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    messages,
    modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
  });
  try {
    const response = await client.send(command);
    if (!response.stream) {
      throw new Error('No stream returned');
    }
    for await (const message of response.stream) {
      if (message.contentBlockDelta?.delta?.text) {
        yield message.contentBlockDelta.delta.text;
      }
      if (message.metadata) {
        analytics.capture({
          distinctId: userID,
          event: '$ai_generation',
          properties: {
            $ai_input_tokens: message.metadata.usage?.inputTokens,
            $ai_latency: message.metadata.metrics?.latencyMs
              ? message.metadata.metrics.latencyMs / 1000 // in seconds
              : undefined,
            $ai_model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
            $ai_output_tokens: message.metadata.usage?.outputTokens,
            $ai_provider: 'aws',
            $ai_trace_id: traceID,
          },
        });
      }
    }
  } catch (error) {
    logger.error(error);
    analytics.captureException(error, userID, {
      $ai_error: error instanceof Error ? error.message : 'Unknown error',
      $ai_is_error: true,
      $ai_model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
      $ai_provider: 'aws',
      $ai_trace_id: traceID,
    });
    throw error;
  }
}
