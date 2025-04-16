import { embedDocumentChunks, embedQuery } from 'ai/embeddings';
import { rerank } from 'ai/rerank';
import { chunkDocument } from 'ai/utils/chunking';
import {
  bulkAddChunks,
  downloadBlob,
  textSearch,
  updateDocument,
  vectorSearch,
} from 'database/documents';
import { parseDocument } from 'parser';
import { analytics } from 'service-utils/analytics';
import type { SearchResultChunks } from '../../../packages/ai/src/providers/rerank/chunk';

export {
  addDocument,
  deleteDocument,
  getDocumentByID,
  getDocumentsBySpaceID,
} from 'database/documents';

/**
 * Parse and index a document
 * @param root named parameters
 * @param root.documentID the ID of the document to parse and index
 * @param root.userID the user ID
 * @returns the updated document
 */
export async function parseAndIndexDocument({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<Awaited<ReturnType<typeof updateDocument>>> {
  const traceID = crypto.randomUUID();

  const downloadBlobStart = Date.now();
  const { data, mimeType } = await downloadBlob({ documentID, userID });
  const downloadBlobEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (downloadBlobEnd - downloadBlobStart) / 1000, // in seconds
      $ai_span_name: 'download blob',
      $ai_trace_id: traceID,
    },
  });

  const parseDocumentStart = Date.now();
  const text = await parseDocument({
    binaryStream: data,
    mimeType,
  });
  const parseDocumentEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (parseDocumentEnd - parseDocumentStart) / 1000, // in seconds
      $ai_span_name: 'parse document',
      $ai_trace_id: traceID,
      mimeType,
    },
  });

  const chunkDocumentStart = Date.now();
  const chunks = await chunkDocument({
    document: text,
  });
  const chunkDocumentEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (chunkDocumentEnd - chunkDocumentStart) / 1000, // in seconds
      $ai_span_name: 'chunk document',
      $ai_trace_id: traceID,
      mimeType,
    },
  });

  const chunksWithEmbeddings = await embedDocumentChunks({
    chunks,
    model: 'cohere.embed-multilingual-v3',
    traceID,
    userID,
  });

  const bulkAddChunksStart = Date.now();
  await bulkAddChunks({
    chunks: chunksWithEmbeddings.map((chunk) => {
      return {
        chunkContent: chunk.chunkContent,
        chunkID: chunk.chunkID,
        documentID,
        embedding: chunk.embedding,
        spaceID: userID,
        userID,
      };
    }),
  });
  const bulkAddChunksEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (bulkAddChunksEnd - bulkAddChunksStart) / 1000, // in seconds
      $ai_span_name: 'bulk add chunks',
      $ai_trace_id: traceID,
      mimeType,
    },
  });

  const updateDocumentStart = Date.now();
  const updatedDocument = await updateDocument({
    documentID,
    status: 'indexed',
    userID,
  });
  const updateDocumentEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (updateDocumentEnd - updateDocumentStart) / 1000, // in seconds
      $ai_span_name: 'update document',
      $ai_trace_id: traceID,
      mimeType,
    },
  });

  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (updateDocumentEnd - downloadBlobStart) / 1000, // in seconds
      $ai_span_name: 'parse and index document',
      $ai_trace_id: traceID,
      mimeType,
    },
  });
  return updatedDocument;
}

/**
 * Search for documents in a space
 *
 * Note: there are various "speed" options:
 * - fast: will skip Hyde and skip query expansion; use cpu reranking
 * - detailed: will use Hyde, query expansion, and the best reranker available
 * @param root named parameters
 * @param root.spaceID the ID of the space to search in
 * @param root.userID the ID of the user
 * @param root.query the query to search for
 * @param root.traceID the trace ID
 * @param root.speed the speed of the search
 * @param root.maxSearchResults the maximum number of results to return during the search
 * @param root.maxOutputResults the maximum number of results to return after reranking
 * @returns the search results
 */
export async function searchDocuments({
  maxOutputResults = 100,
  maxSearchResults = 200,
  query,
  spaceID,
  speed = 'fast',
  traceID,
  userID,
}: {
  maxOutputResults?: number;
  maxSearchResults?: number;
  query: string;
  spaceID: string;
  speed?: 'detailed' | 'fast';
  traceID: string;
  userID: string;
}): Promise<SearchResultChunks> {
  const searchSpanID = crypto.randomUUID();
  const startTime = Date.now();
  const embeddingPromise = embedQuery({
    query,
    traceID,
    userID,
  });
  const searchStart = Date.now();
  const keywordSearchPromise = textSearch({
    maxResults: maxSearchResults,
    query,
    spaceID,
    userID,
  });
  const embedding = await embeddingPromise;
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (Date.now() - startTime) / 1000, // in seconds
      $ai_parent_id: searchSpanID,
      $ai_span_name: 'embed query',
      $ai_trace_id: traceID,
    },
  });
  const vectorSearchPromise = vectorSearch({
    embedding,
    maxResults: maxSearchResults,
    spaceID,
    userID,
  });
  const [keywordResults, vectorResults] = await Promise.all([
    keywordSearchPromise,
    vectorSearchPromise,
  ]);
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (Date.now() - searchStart) / 1000, // in seconds
      $ai_parent_id: searchSpanID,
      $ai_span_name: 'hybrid search',
      $ai_trace_id: traceID,
    },
  });

  const reranked = await rerank({
    keywordResults,
    maxResults: maxOutputResults,
    model: speed === 'fast' ? 'rrf' : 'cohere-rerank-v3.5',
    query,
    traceID,
    userID,
    vectorResults,
  });

  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (Date.now() - startTime) / 1000, // in seconds
      $ai_span_id: searchSpanID,
      $ai_span_name: 'search documents',
      $ai_trace_id: traceID,
    },
  });
  return reranked;
}
