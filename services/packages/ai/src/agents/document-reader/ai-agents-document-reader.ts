import type { LanguageModelMessage } from '../../providers/lm/interfaces';
import { complete } from '../../providers/lm/ai-providers-lm';

const systemPrompt = `
<you>
You are an agent in a chain of agents, you are specialized in document information extraction.
</you>

<input>
You will be given a document with its content, and a prompt from another agent of what do find and do with this document.
</input>

<goal>
You need to follow the prompt given by the other agent
</goal>
`;

/**
 * Document reader agent: will read the document and extract the information requested
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.traceID The trace ID associated with the conversation
 * @param root.userID The user ID associated with the conversation
 * @returns The response from the language model
 */
export async function agentReader({
  messages,
  traceID,
  userID,
}: {
  messages: LanguageModelMessage[];
  traceID: string;
  userID: string;
}): Promise<{
  responseMessage: LanguageModelMessage;
  stopReason: string;
}> {
  return complete({
    messages,
    model: 'claude-3-7-sonnet',
    systemPrompt,
    tools: undefined,
    traceID,
    userID,
  });
}
