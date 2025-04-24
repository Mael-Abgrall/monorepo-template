import type { Message as AWSBedrockMessage } from '@aws-sdk/client-bedrock-runtime';
export type { Message as LanguageModelMessage } from '@aws-sdk/client-bedrock-runtime';

export interface LanguageModelMessageNew extends AWSBedrockMessage {
  content: (ContentBlock | ToolUseBlock)[];
  role: 'assistant' | 'user';
}

export interface LanguageModelTool {
  description: string;
  inputSchema: object;
  name: string;
}

export type StreamingInterfaces =
  | Streaming1
  | Streaming2
  | Streaming3
  | Streaming4
  | Streaming5;

interface ContentBlock {
  text: string;
}

interface Streaming1 {
  contentBlockDelta: {
    contentBlockIndex: number;
    delta: { toolUse: { input: string } };
  };
}

interface Streaming2 {
  contentBlockDelta: { contentBlockIndex: number; delta: { text: string } };
}

interface Streaming3 {
  messageStop: { stopReason: 'end_turn' | 'tool_use' };
}

interface Streaming4 {
  metadata: {
    metrics: { latencyMs: number };
    usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  };
}

interface Streaming5 {
  contentBlockStart: {
    contentBlockIndex: number;
    p: string;
    start: { toolUse: { name: string; toolUseId: string } };
  };
}

interface ToolUseBlock {
  toolUse: { input: string; name: string };
}
