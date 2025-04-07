import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { serverFetch } from 'service-utils/fetch';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('ai-providers-embeddings.ts');

/**
 * OpenAI embedding models
 */
export type EmbeddingModel =
  | 'text-embedding-3-large'
  | 'text-embedding-3-small'
  | 'text-embedding-ada-002';

/**
 * Generate embeddings for a text using OpenAI's API
 * @param root named parameters
 * @param root.model The embedding model to use
 * @param root.text The text to generate embeddings for
 * @param root.traceID The trace ID for logging
 * @param root.userID The user ID for logging
 * @returns The embedding vector
 */
export async function generateEmbeddings({
  model = 'text-embedding-3-small',
  text,
  traceID,
  userID,
}: {
  model?: EmbeddingModel;
  text: string;
  traceID: string;
  userID: string;
}): Promise<number[]> {
  const startTime = Date.now();

  try {
    logger.info(`Generating embeddings with model ${model}`, { traceID });

    // Make sure we have an OpenAI API key in the environment
    if (!environment.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in the environment');
    }

    // Call OpenAI API directly using ofetch
    const response = await serverFetch<{
      data: [{ embedding: number[] }];
    }>('https://api.openai.com/v1/embeddings', {
      body: JSON.stringify({
        input: text,
        model,
      }),
      headers: {
        Authorization: `Bearer ${environment.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    // Log the successful API call
    const duration = Date.now() - startTime;
    analytics.capture({
      distinctId: userID,
      event: 'embeddings_generated',
      properties: {
        durationMs: duration,
        inputLength: text.length,
        model,
        traceId: traceID,
      },
    });

    logger.info(`Embeddings generated successfully in ${duration}ms`, {
      traceID,
    });

    // Return the embedding vector
    return response.data[0].embedding;
  } catch (error) {
    // Log the error
    const duration = Date.now() - startTime;
    analytics.captureException(error, userID, {
      durationMs: duration,
      inputLength: text.length,
      model,
      traceId: traceID,
    });

    logger.error(
      `Error generating embeddings: ${error instanceof Error ? error.message : String(error)}`,
      { traceID },
    );
    throw error;
  }
}
