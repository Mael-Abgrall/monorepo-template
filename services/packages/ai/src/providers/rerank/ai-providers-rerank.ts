import type { SearchResultChunks } from './chunk';
import { rerankCohere } from './ai-provider-rerank-aws';
import { rerankRRF } from './ai-provider-rerank-cpu';

/**
 * Rerank results
 * @param root named parameters
 * @param root.keywordResults the keyword search results
 * @param root.maxResults the maximum number of results to return
 * @param root.model the model to use
 * @param root.query the query to search for
 * @param root.traceID the trace ID
 * @param root.userID the ID of the user
 * @param root.vectorResults the vector search results
 * @returns the re-ranked results
 */
export async function rerank({
  keywordResults,
  maxResults,
  model = 'cohere-rerank-v3.5',
  query,
  traceID,
  userID,
  vectorResults,
}: {
  keywordResults: SearchResultChunks;
  maxResults: number;
  model: 'cohere-rerank-v3.5' | 'rrf';
  query: string;
  traceID: string;
  userID: string;
  vectorResults: SearchResultChunks;
}): Promise<SearchResultChunks> {
  switch (model) {
    case 'cohere-rerank-v3.5': {
      return rerankCohere({
        keywordResults,
        maxResults,
        query,
        traceID,
        userID,
        vectorResults,
      });
    }

    case 'rrf': {
      return rerankRRF({
        keywordResults,
        maxResults,
        traceID,
        userID,
        vectorResults,
      });
    }

    default: {
      throw new Error('Invalid model');
    }
  }
}
