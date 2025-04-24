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
 * Complete a text using an AWS Bedrock model
 * @param root named parameters
 * @param root.messages The messages history
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID for this AI generation
 * @param root.userID The user ID
 * @param root.model The bedrock model to call
 * @returns The model response
 */
export async function bedrockComplete({
  messages,
  model,
  systemPrompt,
  tools,
  traceID,
  userID,
}: {
  messages: AWSBedrockMessage[];
  model: string;
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
    modelId: model,
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
        $ai_model: model,
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
      $ai_model: model,
      $ai_provider: 'aws',
      $ai_trace_id: traceID,
    });
    throw error;
  }
}

/**
 * Stream a response from a bedrock model
 * @param root named parameters
 * @param root.messages The messages history
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID of the generation
 * @param root.userID The user ID
 * @param root.model The bedrock model to call
 * @yields A stream of the text response from the model
 */
export async function* bedrockCompleteStream({
  messages,
  model,
  systemPrompt,
  tools,
  traceID,
  userID,
}: {
  messages: AWSBedrockMessage[];
  model: string;
  systemPrompt: string | undefined;
  tools: AWSBedrockTool[] | undefined;
  traceID: string;
  userID: string;
}): AsyncGenerator<string> {
  const client = prepareClient();
  const command = new ConverseStreamCommand({
    inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
    messages,
    modelId: model,
    system: systemPrompt ? [{ text: systemPrompt }] : undefined,
    toolConfig: tools
      ? {
          tools,
        }
      : undefined,
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
            $ai_model: model,
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
      $ai_model: model,
      $ai_provider: 'aws',
      $ai_trace_id: traceID,
    });
    throw error;
  }
}

// /**
//  * Stream a response from a bedrock model
//  * @param root named parameters
//  * @param root.messages The messages history
//  * @param root.systemPrompt The system prompt to use
//  * @param root.tools The tools to use
//  * @param root.traceID The trace ID of the generation
//  * @param root.userID The user ID doing the action
//  * @param root.model The bedrock model to call
//  * @returns The response from the model
//  */
// export async function bedrockCompleteStreamToBuffer({
//   messages,
//   model,
//   systemPrompt,
//   tools,
//   traceID,
//   userID,
// }: {
//   messages: AWSBedrockMessage[];
//   model: string;
//   systemPrompt: string | undefined;
//   tools: AWSBedrockTool[] | undefined;
//   traceID: string;
//   userID: string;
// }) {
//   const client = prepareClient();
//   const command = new ConverseStreamCommand({
//     inferenceConfig: { maxTokens: 512, temperature: 0.5, topP: 0.9 },
//     messages,
//     modelId: model,
//     system: systemPrompt ? [{ text: systemPrompt }] : undefined,
//     toolConfig: tools
//       ? {
//           tools,
//         }
//       : undefined,
//   });
//   try {
//     const response = await client.send(command);
//     if (!response.stream) {
//       throw new Error('No stream returned');
//     }
//     const responseMessage: LanguageModelMessage = {
//       content: [],
//       role: 'assistant',
//     };
//     let stopReason = '';

//     for await (const message of response.stream as AsyncIterable<StreamingInterfaces>) {
//       if (
//         'contentBlockDelta' in message &&
//         'text' in message.contentBlockDelta.delta &&
//         message.contentBlockDelta.delta.text
//       ) {
//         const index = message.contentBlockDelta.contentBlockIndex;
//         const currentContent = responseMessage.content.at(index);
//         if (currentContent && 'text' in currentContent) {
//           responseMessage.content[index] = {
//             text: currentContent.text + message.contentBlockDelta.delta.text,
//           };
//         } else {
//           responseMessage.content.push({
//             text: message.contentBlockDelta.delta.text,
//           });
//         }
//       } else if ('messageStop' in message) {
//         stopReason = message.messageStop.stopReason;
//       } else if ('contentBlockStart' in message) {
//         // console.log('contentBlockStart.start', message.contentBlockStart.start);
//         responseMessage.content.push({
//           toolUse: {
//             input: '',
//             name: message.contentBlockStart.start.toolUse.name,
//           },
//         });
//       } else if (
//         'contentBlockDelta' in message &&
//         'toolUse' in message.contentBlockDelta.delta
//       ) {
//         const index = message.contentBlockDelta.contentBlockIndex;
//         const toolUse = message.contentBlockDelta.delta.toolUse;
//         // console.log('toolUse', toolUse);
//         const currentContent = responseMessage.content.at(index);
//         if (currentContent && 'toolUse' in currentContent) {
//           responseMessage.content[index] = {
//             toolUse: {
//               input: currentContent.toolUse.input + toolUse.input,
//               name: currentContent.toolUse.name,
//             },
//           };
//         }
//       } else if ('metadata' in message) {
//         analytics.capture({
//           distinctId: userID,
//           event: '$ai_generation',
//           properties: {
//             $ai_input_tokens: message.metadata.usage.inputTokens,
//             $ai_latency: message.metadata.metrics.latencyMs / 1000,
//             $ai_model: model,
//             $ai_output_tokens: message.metadata.usage.outputTokens,
//             $ai_provider: 'aws',
//             $ai_trace_id: traceID,
//           },
//         });
//       } else {
//         console.log('unknown block:', message);
//       }
//     }
//     return {
//       responseMessage,
//       stopReason,
//     };
//   } catch (error) {
//     logger.error(error);
//     analytics.captureException(error, userID, {
//       /* v8 disable start -- not a problem */
//       $ai_error: error instanceof Error ? error.message : 'Unknown error',
//       /* v8 disable end */
//       $ai_is_error: true,
//       $ai_model: model,
//       $ai_provider: 'aws',
//       $ai_trace_id: traceID,
//     });
//     throw error;
//   }
// }

/**
 * Prepare the AWS client for the request
 *
 * Notes: how to remove the SDK for our fetch implementation:
 * - [The API parameters](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html#bedrock-runtime_Converse-request-messages)
 * - [Generating the SHA signature](https://developers.cloudflare.com/ai-gateway/providers/bedrock/#use-aws4fetch-sdk-with-typescript)
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
