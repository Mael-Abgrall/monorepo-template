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
 * @param root.text The document to read
 * @param root.traceID The trace ID for analytics
 * @param root.userID The user ID doing the action
 * @returns The response from the language model
 */
export async function agentReader({
  text,
  traceID,
  userID,
}: {
  text: string;
  traceID: string;
  userID: string;
}): Promise<string> {
  const response = await complete({
    messages: [
      {
        content: [
          {
            text: `
<document>
${text}
</document>
            `,
          },
        ],
        role: 'user',
      },
    ],
    model: 'claude-3-5-sonnet',
    systemPrompt,
    tools: undefined,
    traceID,
    userID,
  });

  return response.responseMessage.content?.[0]?.text ?? '';
}
