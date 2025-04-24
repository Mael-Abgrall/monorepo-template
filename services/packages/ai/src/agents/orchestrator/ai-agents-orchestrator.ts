import { Type } from 'shared/typebox';
import type {
  LanguageModelMessage,
  LanguageModelTool,
} from '../../providers/lm/interfaces';
import { complete } from '../../providers/lm/ai-providers-lm';

const mainPrompt = `
<goal>
Your goal is to help answer the user's query using all the agents and functions available to you.
Those agents and tools will provide the necessary information to answer the user's query.
</goal>

<instructions>
  <instruction>
    You need to give a list of actions you will do, and tool or agent calls you will make.
  </instruction>
  
  <instruction>
    You should update this list of actions depending on the results of the tools, to keep the list up-to-date or change it if the information is not what you expected.
  </instruction>
  
  <instruction>
    If you believe there is enough information from the previous messages or tool responses results to answer the user's query, you should answer it.
  </instruction>

  <instruction>
    If you believe the information needed to answer is not available, you should ask the user for clarification.
  </instruction>
</instructions>
`;

const withSpacePrompt = `
<you>
You are the orchestrator of many other agents and tools in a chat application.
This chat application uses proprietary data that is not in your training, and the user messages are related to this data.
This chat is associated with a space, that holds additional information related to the current chat
</you>
`;

const youWithoutSpace = `
<you>
You are the orchestrator of many other agents and tools in a chat application.
This chat application uses proprietary data that is not in your training, and the user messages are related to this data.
</you>
`;

/**
 * The tools defined here require a spaceID,
 *   and will work/be given to the agent only when there is a spaceID.
 */
const spaceTools: LanguageModelTool[] = [
  {
    description: `
This tool will search inside the content of documents associated to the current space.
It is good:
- when it is not evident which document will have the information required based on their names or content.
- When the user request is not precise enough to identify a document.

It is not good:
- when you have a rough idea, or know exactly which document to open.

Results:
The result will be a list of the most relevant document chunks compared to the query.
`,
    inputSchema: Type.Object({
      query: Type.String({
        description: 'The query used to search for documents',
      }),
    }),
    name: 'search_space',
  },
  {
    description: `
This tool will call the document reading agent, who will fetch the original document, read it and extract the information you ask for in the request parameter. 

It is good:
- when you need to open an entire document and extract specific information from it.

It is not good:
- when you have no idea which document will have the information required.

Results:
The result will be the output from another AI agent.
`,
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
    description: `
This tool will list all the documents available in the space.

It is good:
- when you have a rough or precise idea where the information is located, and the result could help you which documents to open.
- when you need an overview of the documents available.

It is not good:
- when you have no idea which document will have the information required.

Results:
The result will be a list of the documents names.
`,
    inputSchema: Type.Object({}),
    name: 'list_documents',
  },
];

/**
 * The tools defined here do not require a spaceID,
 *   and will always be given to the agent.
 */
const genericTools: LanguageModelTool[] = [];

/**
 * Orchestrator agent: will define the steps and tools to call to answer the user's request
 * @param root named parameters
 * @param root.messages The messages of the chat
 * @param root.spaceID The space ID associated with the chat
 * @param root.traceID The trace ID associated with the chat
 * @param root.userID The user ID associated with the chat
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
  const systemPrompt = spaceID
    ? withSpacePrompt + mainPrompt
    : youWithoutSpace + mainPrompt;
  return complete({
    messages,
    model: 'claude-3-5-sonnet',
    systemPrompt,
    tools,
    traceID,
    userID,
  });
}
