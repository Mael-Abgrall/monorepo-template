import { Type } from 'shared/typebox';
import type {
  LanguageModelMessage,
  LanguageModelTool,
} from '../../providers/lm/interfaces';
import { complete } from '../../providers/lm/ai-providers-lm';

const systemPrompt = `
<you>
You are the orchestrator of many other agents and functions in a chat application.
This application uses proprietary data that is not in your training.
</you>

<goal>
Your goal is to help answer the user's query using all the agents and functions available to you.
Those agents and tools will provide the necessary information to answer the user's query.
</goal>

<output>
You need to give a list of actions you will do, and tool or agent calls you will make.
If you believe there is enough information to answer the user's query, you should call the "finalize_answer" function.
</output>
`;

/**
 * The tools defined here require a spaceID,
 *   and will work/be given to the agent only when there is a spaceID.
 */
const spaceTools: LanguageModelTool[] = [
  {
    description:
      'This tool will search for similar documents associated to the current space. This is an hybrid search that excel at retrieving documents when the query is loosely defined or when you are not sure what you are looking for. It will give you a list of chunks of documents that are most relevant to your query.',
    inputSchema: Type.Object({
      query: Type.String({
        description: 'The query used to search for documents',
      }),
    }),
    name: 'search_space',
  },
  {
    description:
      'This tool will call the document reading agent, who will fetch the original document, read it and extract the information according to the given request. This function is useful when you need to open an entire document and extract specific information from it.',
    inputSchema: Type.Object({
      documentID: Type.String({
        description: 'The ID of the document to retrieve',
      }),
      request: Type.String({
        description:
          'This is a prompt for the document reading agent, explaining what this agent should extract from the document',
      }),
    }),
    name: 'read_document',
  },
  {
    description:
      'This tool will list all the documents available in the space. This is useful when you need to get an overview of the documents available in the space, or when you need to find a specific document instead of calling the search_space function.',
    inputSchema: Type.Object({}),
    name: 'list_documents',
  },
];

/**
 * The tools defined here do not require a spaceID,
 *   and will always be given to the agent.
 */
const genericTools: LanguageModelTool[] = [
  {
    description:
      'This tool will finalize the answer, and return the final response to the user in a stream. Call this function when you believe all the information gathered is sufficient to answer the user',
    inputSchema: Type.Object({}),
    name: 'finalize_answer',
  },
];

/**
 * Orchestrator agent: will define the steps and tools to call to answer the user's request
 * @param root named parameters
 * @param root.messages The messages of the conversation
 * @param root.spaceID The space ID associated with the conversation
 * @param root.traceID The trace ID associated with the conversation
 * @param root.userID The user ID associated with the conversation
 * @returns The response from the language model
 */
export async function agentOrchestrator({
  messages,
  spaceID,
  traceID,
  userID,
}: {
  messages: LanguageModelMessage[];
  spaceID: string | undefined;
  traceID: string;
  userID: string;
}): Promise<{
  responseMessage: LanguageModelMessage;
  stopReason: string;
}> {
  const tools = spaceID ? [...spaceTools, ...genericTools] : genericTools;
  return complete({
    messages,
    model: 'claude-3-7-sonnet',
    systemPrompt,
    tools,
    traceID,
    userID,
  });
}
