import type { Message as AWSMessage } from '@aws-sdk/client-bedrock-runtime';
import { claude37SonnetStream } from './ai-providers-lm-aws';

/**
 * A common interface for language model's messages
 */
export interface LMMessage {
  content: string;
  role: 'assistant' | 'user';
}

/**
 * Complete a stream of text using the chosen language model
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.model the language model to use
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
  messages: LMMessage[];
  model: 'claude-3-5-sonnet' | 'claude-3-7-sonnet';
  traceID: string;
  userID: string;
}): AsyncGenerator<string> {
  switch (model) {
    case 'claude-3-7-sonnet': {
      const mappedToClaude: AWSMessage[] = messages.map((message) => {
        return {
          content: [{ text: message.content }],
          role: message.role,
        };
      });
      yield* claude37SonnetStream({
        messages: mappedToClaude,
        traceID,
        userID,
      });
      return;
    }

    case 'claude-3-5-sonnet': {
      throw new Error('Claude 3.5 Sonnet Not implemented');
    }

    default: {
      throw new Error(`Unknown model ${String(model)}`);
    }
  }
}
