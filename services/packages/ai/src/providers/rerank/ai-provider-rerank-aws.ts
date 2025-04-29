import { analytics } from 'service-utils/analytics';
import { environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('ai-provider-rerank-aws.ts');

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

import type { SearchResultChunks } from './chunk';

/**
 * Cohere rerank request body interface
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-rerank.html
 */
interface CohereRerankBody {
  /** Required API version parameter */
  api_version: number;
  /** Array of documents to rerank */
  documents: string[];
  /** The query to rerank results for */
  query: string;
  /** Return the document text in the response */
  return_documents?: boolean;
  /** Maximum number of reranked results to return */
  top_n?: number;
}

/**
 * Cohere rerank response interface
 * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-rerank.html
 */
interface CohereRerankResponse {
  /** Array of reranked results */
  results: {
    /** Document text if return_documents was true */
    document?: string;
    /** Index of the document in the original array */
    index: number;
    /** Relevance score between 0 and 1 */
    relevance_score: number;
  }[];
}

/**
 * Rerank results using AWS Bedrock Cohere reranking
 * @param root named parameters
 * @param root.keywordResults the keyword search results
 * @param root.maxResults the maximum number of results to return
 * @param root.query the query to search for
 * @param root.traceID the trace ID
 * @param root.userID the ID of the user
 * @param root.vectorResults the vector search results
 * @returns the re-ranked results
 */
export async function rerankCohere({
  keywordResults,
  maxResults,
  query,
  traceID,
  userID,
  vectorResults,
}: {
  keywordResults: SearchResultChunks;
  maxResults: number;
  query: string;
  traceID: string;
  userID: string;
  vectorResults: SearchResultChunks;
}): Promise<SearchResultChunks> {
  if (keywordResults.length === 0 && vectorResults.length === 0) {
    throw new Error('No results to rerank');
  }
  if (vectorResults.length === 0) {
    return keywordResults;
  }
  if (keywordResults.length === 0) {
    return vectorResults;
  }

  try {
    const start = performance.now();

    const combinedResults = [...vectorResults];
    for (const keywordResult of keywordResults) {
      const exists = combinedResults.some((result) => {
        return result.chunkID === keywordResult.chunkID;
      });
      if (!exists) {
        combinedResults.push(keywordResult);
      }
    }

    const documents = combinedResults.map((result) => {
      return result.chunkContent;
    });

    const bedrockClient = getClient();
    const command = new InvokeModelCommand({
      body: JSON.stringify({
        api_version: 2,
        documents,
        query,
        top_n: maxResults,
      } satisfies CohereRerankBody),
      contentType: 'application/json',
      modelId: 'cohere.rerank-v3-5:0',
    });

    const response = await bedrockClient.send(command);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- assume it's safe
    const responseBody: CohereRerankResponse = JSON.parse(
      Buffer.from(response.body).toString('utf8'),
    );

    const rerankedResults = responseBody.results.map((result) => {
      return {
        ...combinedResults[result.index],
        score: result.relevance_score,
      };
    });

    analytics.capture({
      distinctId: userID,
      event: '$ai_span',
      properties: {
        $ai_latency: (performance.now() - start) / 1000, // in seconds
        $ai_model: 'cohere.rerank-v3-5:0',
        $ai_provider: 'aws',
        $ai_span_name: 'rerank',
        $ai_trace_id: traceID,
      },
    });

    return rerankedResults;
  } catch (error) {
    logger.error(error);
    analytics.captureException(error, userID, {
      /* v8 disable start -- not a problem */
      $ai_error: error instanceof Error ? error.message : 'Unknown error',
      /* v8 disable end */
      $ai_is_error: true,
      $ai_model: 'cohere.rerank-v3-5:0',
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
