import type {
  Tool as AWSBedrockTool,
  ToolInputSchema as AWSBedrockToolInputSchema,
} from '@aws-sdk/client-bedrock-runtime';
import type { LanguageModelMessage, LanguageModelTool } from './interfaces';
import { bedrockComplete, bedrockCompleteStream } from './ai-providers-lm-aws';

export type { LanguageModelMessage, LanguageModelTool } from './interfaces';
export type {
  ToolResultBlock,
  ToolUseBlock,
} from '@aws-sdk/client-bedrock-runtime'; // todo: replace this by proper types

/**
 * Complete a text using the chosen language model
 * @param root named parameters
 * @param root.messages The messages history
 * @param root.model The language model to use
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID for this AI generation
 * @param root.userID The user ID doing the action
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
    case 'claude-3-5-sonnet': {
      return bedrockComplete({
        messages,
        model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        systemPrompt,
        tools: mapToolsToBedrock({ tools }),
        traceID,
        userID,
      });
    }

    case 'claude-3-7-sonnet': {
      return bedrockComplete({
        messages,
        model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        systemPrompt,
        tools: mapToolsToBedrock({ tools }),
        traceID,
        userID,
      });
    }

    default: {
      throw new Error(`Unknown model ${String(model)}`);
    }
  }
}

/**
 * Stream the completion of a text using the chosen language model
 * @param root named parameters
 * @param root.messages The messages history
 * @param root.model The language model to use
 * @param root.systemPrompt The system prompt to use
 * @param root.tools The tools to use
 * @param root.traceID The trace ID for this AI generation
 * @param root.userID The user ID doing the action
 * @yields A stream of text
 */
export async function* completeStream({
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
}): AsyncGenerator<string> {
  switch (model) {
    case 'claude-3-5-sonnet': {
      yield* bedrockCompleteStream({
        messages,
        model: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        systemPrompt,
        tools: mapToolsToBedrock({ tools }),
        traceID,
        userID,
      });
      return;
    }

    case 'claude-3-7-sonnet': {
      yield* bedrockCompleteStream({
        messages,
        model: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        systemPrompt,
        tools: mapToolsToBedrock({ tools }),
        traceID,
        userID,
      });
      return;
    }

    default: {
      throw new Error(`Unknown model ${String(model)}`);
    }
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
