import type {
  Message as AWSBedrockMessage,
  Tool as AWSBedrockTool,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('ai-providers-lm-aws.ts');

/**
 * Complete a text using the Claude 3.7 Sonnet model
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID of the conversation
 * @param root.userID The user ID
 * @returns The model response normalized
 */
export async function claude37Sonnet({
  messages,
  systemPrompt,
  tools,
  traceID,
  userID,
}: {
  messages: AWSBedrockMessage[];
  systemPrompt: string | undefined;
  tools: AWSBedrockTool[] | undefined;
  traceID: string;
  userID: string;
}): Promise<{
  responseMessage: AWSBedrockMessage;
  stopReason: string;
}> {
  const client = prepareClient();
  const command = new ConverseCommand({
    inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    messages,
    // modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
    modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
    system: systemPrompt ? [{ text: systemPrompt }] : undefined,
    toolConfig: tools
      ? {
          tools,
        }
      : undefined,
  });
  try {
    const response = await client.send(command);
    if (!response.output?.message?.content) {
      throw new Error('No content returned');
    }
    if (!response.stopReason) {
      throw new Error('No stop reason returned');
    }

    analytics.capture({
      distinctId: userID,
      event: '$ai_generation',
      properties: {
        $ai_input_tokens: response.usage?.inputTokens,
        $ai_latency: response.metrics?.latencyMs
          ? response.metrics.latencyMs / 1000 // in seconds
          : undefined,
        $ai_model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        $ai_output_tokens: response.usage?.outputTokens,
        $ai_provider: 'aws',
        $ai_trace_id: traceID,
      },
    });
    return {
      responseMessage: response.output.message,
      stopReason: response.stopReason,
    };
  } catch (error) {
    logger.error(error);
    analytics.captureException(error, userID, {
      /* v8 disable start -- not a problem */
      $ai_error: error instanceof Error ? error.message : 'Unknown error',
      /* v8 disable end */
      $ai_is_error: true,
      $ai_model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
      $ai_provider: 'aws',
      $ai_trace_id: traceID,
    });
    throw error;
  }
}

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
  messages: AWSBedrockMessage[];
  traceID: string;
  userID: string;
}): AsyncGenerator<string> {
  const client = prepareClient();
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
      /* v8 disable start -- not a problem */
      $ai_error: error instanceof Error ? error.message : 'Unknown error',
      /* v8 disable end */
      $ai_is_error: true,
      $ai_model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
      $ai_provider: 'aws',
      $ai_trace_id: traceID,
    });
    throw error;
  }
}

// /**
//  * Extract the tool requests from the response
//  * @param root named parameters
//  * @param root.content The content of the response
//  * @returns The tool requests
//  */
// function getToolRequests({
//   content,
// }: {
//   content: ContentBlock[];
// }): ToolRequest[] {
//   const toolRequests: ToolRequest[] = [];
//   for (const contentObject of content) {
//     if (contentObject.toolUse) {
//       if (!contentObject.toolUse.name) {
//         throw new Error('No tool name returned in tool request');
//       }
//       if (!contentObject.toolUse.toolUseId) {
//         throw new Error('No tool use ID returned in tool request');
//       }
//       toolRequests.push({
//         name: contentObject.toolUse.name,
//         parameters: contentObject.toolUse.input as
//           | undefined
//           | { [key: string]: unknown },
//         toolUseId: contentObject.toolUse.toolUseId,
//       });
//     }
//   }
//   return toolRequests;
// }

/**
 * Prepare the AWS client for the request
 * @returns The client
 */
function prepareClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    credentials: {
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
    },
    region: 'eu-central-1',
  });
}
