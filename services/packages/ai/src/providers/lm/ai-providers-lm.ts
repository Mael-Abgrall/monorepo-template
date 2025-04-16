import type {
  Tool as AWSBedrockTool,
  ToolInputSchema as AWSBedrockToolInputSchema,
} from '@aws-sdk/client-bedrock-runtime';
import type { LanguageModelMessage, LanguageModelTool } from './interfaces';
import { claude37Sonnet, claude37SonnetStream } from './ai-providers-lm-aws';

export type { LanguageModelMessage, LanguageModelTool } from './interfaces';
export type {
  ToolResultBlock,
  ToolUseBlock,
} from '@aws-sdk/client-bedrock-runtime'; // todo: replace this by proper types

/**
 * Complete a text using the chosen language model
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.model The language model to use
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID associated with the conversation
 * @param root.userID The user ID associated with the conversation
 * @returns The response from the language model
 */
export async function complete({
  messages,
  model,
  systemPrompt,
  tools,
  traceID,
  userID,
}: {
  messages: LanguageModelMessage[];
  model: 'claude-3-5-sonnet' | 'claude-3-7-sonnet';
  systemPrompt: string | undefined;
  tools: LanguageModelTool[] | undefined;
  traceID: string;
  userID: string;
}): Promise<{
  responseMessage: LanguageModelMessage;
  stopReason: string;
}> {
  switch (model) {
    case 'claude-3-7-sonnet': {
      return claude37Sonnet({
        messages,
        systemPrompt,
        tools: mapToolsToBedrock({ tools }),
        traceID,
        userID,
      });
    }

    /* v8 ignore start -- do later */
    case 'claude-3-5-sonnet': {
      throw new Error('Claude 3.5 Sonnet Not implemented');
    }

    default: {
      throw new Error(`Unknown model ${String(model)}`);
    }
    /* v8 ignore end */
  }
}

/**
 * Complete a stream of text using the chosen language model
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.model The language model to use
 * @param root.traceID The trace ID of the conversation
 * @param root.userID The user ID
 * @yields A stream of text
 */
export async function* completeStream({
  messages,
  model,
  traceID,
  userID,
}: {
  messages: LanguageModelMessage[];
  model: 'claude-3-5-sonnet' | 'claude-3-7-sonnet';
  traceID: string;
  userID: string;
}): AsyncGenerator<string> {
  switch (model) {
    case 'claude-3-7-sonnet': {
      yield* claude37SonnetStream({
        messages,
        traceID,
        userID,
      });
      return;
    }

    /* v8 ignore start -- do later */
    case 'claude-3-5-sonnet': {
      throw new Error('Claude 3.5 Sonnet Not implemented');
    }

    default: {
      throw new Error(`Unknown model ${String(model)}`);
    }
    /* v8 ignore end */
  }
}

/**
 * Map a list of tools to the AWS Bedrock format
 * @param root named parameters
 * @param root.tools The tools to map
 * @returns The mapped tools
 */
function mapToolsToBedrock({
  tools,
}: {
  tools: LanguageModelTool[] | undefined;
}): AWSBedrockTool[] | undefined {
  return tools?.map((tool) => {
    return {
      toolSpec: {
        description: tool.description,
        inputSchema: {
          json: tool.inputSchema as AWSBedrockToolInputSchema['json'],
        } as AWSBedrockToolInputSchema,
        name: tool.name,
      },
    } satisfies AWSBedrockTool;
  });
}
