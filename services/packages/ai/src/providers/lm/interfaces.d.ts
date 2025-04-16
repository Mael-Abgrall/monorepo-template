export type { Message as LanguageModelMessage } from '@aws-sdk/client-bedrock-runtime';

export interface LanguageModelTool {
  description: string;
  inputSchema: object;
  name: string;
}
