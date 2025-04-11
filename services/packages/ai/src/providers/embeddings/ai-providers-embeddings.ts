import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('ai-providers-embeddings.ts');

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const maxCharacters = 2048;

/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingBody {
  // Specifies the types of embeddings you want to have returned, can be multiple format
  embedding_types?: string[];
  // Differentiate each type from one another. You should not mix different types together
  input_type:
    | 'classification' // for text classification tasks
    | 'clustering' // for text clustering tasks
    | 'search_document' // To embed search doc in database
    | 'search_query'; // To embed query
  // Array of strings to embed
  texts: string[];
  // specifies the truncate position if input exceeds token limit, suggested to leave NONE(default) since we handle the tokens
  truncate?: 'END' | 'NONE' | 'START';
}

/**
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed.html
 */
interface CohereEmbeddingResponse {
  /** An array of embeddings, where each embedding is an array of floats with 1024 elements. The length of the embeddings array will be the same as the length of the original texts array */
  embeddings: number[][];
  /** response ID */
  id: string;
  /** The response type. This value is always embeddings_floats */
  response_type: 'embeddings_floats';
  /** An array containing the text entries for which embeddings were returned. */
  texts: string[];
}

/**
 * Embed chunks from a document
 * @param root named parameters
 * @param root.chunks the chunks to embed
 * @param root.model the model to use
 * @param root.traceID the trace ID
 * @param root.userID the user ID
 * @returns the embedding of the chunks
 */
export async function embedDocumentChunks({
  chunks,
  model = 'cohere.embed-multilingual-v3',
  traceID,
  userID,
}: {
  chunks: string[];
  model?: 'cohere.embed-multilingual-v3';
  traceID: string;
  userID: string;
}): Promise<{ chunkContent: string; chunkID: string; embedding: number[] }[]> {
  if (
    chunks.some((chunk) => {
      return isTooLarge({ text: chunk });
    })
  ) {
    throw new Error('A document chunk was too large to be embedded');
  }

  try {
    const start = performance.now();

    const bedrockClient = getClient();
    const command = new InvokeModelCommand({
      body: JSON.stringify({
        input_type: 'search_document',
        texts: chunks,
      } satisfies CohereEmbeddingBody),
      modelId: model,
    });
    const response = await bedrockClient.send(command);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- assume it's safe
    const responseBody: CohereEmbeddingResponse = JSON.parse(
      Buffer.from(response.body).toString('utf8'),
    );

    const chunksWithEmbeddings = responseBody.embeddings.map(
      (embedding, index) => {
        return {
          chunkContent: responseBody.texts[index],
          chunkID: crypto.randomUUID(),
          embedding,
        };
      },
    );
    analytics.capture({
      distinctId: userID,
      event: '$ai_embedding',
      properties: {
        // $ai_input_tokens: ,
        $ai_latency: (performance.now() - start) / 1000, // in seconds
        $ai_model: model,
        $ai_provider: 'aws',
        $ai_trace_id: traceID,
      },
    });
    return chunksWithEmbeddings;
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
 * Embed a query
 * @param root named parameters
 * @param root.model the model to use
 * @param root.query the query to embed
 * @param root.traceID the trace ID
 * @param root.userID the user ID
 * @returns the embedding of the query
 */
export async function embedQuery({
  model = 'cohere.embed-multilingual-v3',
  query,
  traceID,
  userID,
}: {
  model?: 'cohere.embed-multilingual-v3';
  query: string;
  traceID: string;
  userID: string;
}): Promise<number[]> {
  if (isTooLarge({ text: query })) {
    throw new Error('A query was too large to be embedded');
  }
  try {
    const start = performance.now();
    const bedrockClient = getClient();
    const command = new InvokeModelCommand({
      body: JSON.stringify({
        input_type: 'search_query',
        texts: [query],
      } satisfies CohereEmbeddingBody),
      modelId: model,
    });
    const response = await bedrockClient.send(command);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- assume it's safe
    const responseBody: CohereEmbeddingResponse = JSON.parse(
      Buffer.from(response.body).toString('utf8'),
    );
    analytics.capture({
      distinctId: userID,
      event: '$ai_embedding',
      properties: {
        // $ai_input_tokens: ,
        $ai_latency: (performance.now() - start) / 1000, // in seconds
        $ai_model: model,
        $ai_provider: 'aws',
        $ai_trace_id: traceID,
      },
    });
    return responseBody.embeddings[0];
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
 * Get a client to the Bedrock Runtime
 * @returns a client to the Bedrock Runtime
 */
function getClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    credentials: {
      accessKeyId: environment.AWS_ACCESS_KEY_ID,
      secretAccessKey: environment.AWS_SECRET_ACCESS_KEY,
    },
    region: 'eu-central-1',
  });
}

/**
 * Check if a text is too large to be embedded
 * @param root named parameters
 * @param root.text the text to check
 * @returns true if the text is too large, false otherwise
 */
function isTooLarge({ text }: { text: string }): boolean {
  return text.length > maxCharacters;
}
