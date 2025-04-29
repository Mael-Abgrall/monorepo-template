import { embedDocumentChunks } from 'ai/embeddings';
import { chunkDocument } from 'ai/utils/chunking';
import {
  bulkAddChunks,
  downloadBlob,
  updateDocument,
} from 'database/documents';
import { parseDocument } from 'parser';
import { analytics } from 'service-utils/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAndIndexDocument } from '../../core-documents';

vi.mock('ai/embeddings');
vi.mock('ai/utils/chunking');
vi.mock('database/documents');
vi.mock('parser');
vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseAndIndexDocument', () => {
  it('should process document through all steps and return updated document', async () => {
    const mockDownloadBlob = {
      data: Buffer.from([1, 2, 3]),
      mimeType: 'application/pdf',
    } satisfies Awaited<ReturnType<typeof downloadBlob>>;
    const mockParsedText = 'This is the parsed document text';
    const mockChunks = ['this is the', 'parsed document text'];

    const mockChunksWithEmbeddings = [
      {
        chunkContent: 'Chunk 1',
        chunkID: 'chunk1',
        embedding: [0.1, 0.2, 0.3],
      },
      {
        chunkContent: 'Chunk 2',
        chunkID: 'chunk2',
        embedding: [0.4, 0.5, 0.6],
      },
    ];

    const mockUpdatedDocument = {
      documentID: 'doc123',
      spaceID: 'user456',
      status: 'indexed',
      title: 'Document Title',
      userID: 'user456',
    } satisfies Awaited<ReturnType<typeof updateDocument>>;

    vi.mocked(downloadBlob).mockResolvedValue(mockDownloadBlob);
    vi.mocked(parseDocument).mockResolvedValue(mockParsedText);
    vi.mocked(chunkDocument).mockResolvedValue(mockChunks);
    vi.mocked(embedDocumentChunks).mockResolvedValue(mockChunksWithEmbeddings);
    vi.mocked(bulkAddChunks).mockResolvedValue(
      void 0 satisfies Awaited<ReturnType<typeof bulkAddChunks>>,
    );
    vi.mocked(updateDocument).mockResolvedValue(
      mockUpdatedDocument satisfies Awaited<ReturnType<typeof updateDocument>>,
    );

    const result = await parseAndIndexDocument({
      documentID: 'doc123',
      userID: 'user456',
    });

    expect(vi.mocked(downloadBlob)).toHaveBeenCalledOnce();
    expect(vi.mocked(downloadBlob)).toHaveBeenCalledWith({
      documentID: 'doc123',
      userID: 'user456',
    });

    expect(vi.mocked(parseDocument)).toHaveBeenCalledOnce();
    expect(vi.mocked(parseDocument)).toHaveBeenCalledAfter(
      vi.mocked(downloadBlob),
    );
    expect(vi.mocked(parseDocument)).toHaveBeenCalledWith({
      binaryStream: mockDownloadBlob.data,
      mimeType: mockDownloadBlob.mimeType,
    });

    expect(vi.mocked(chunkDocument)).toHaveBeenCalledOnce();
    expect(vi.mocked(chunkDocument)).toHaveBeenCalledAfter(
      vi.mocked(parseDocument),
    );
    expect(vi.mocked(chunkDocument)).toHaveBeenCalledWith({
      document: mockParsedText,
    });

    expect(vi.mocked(embedDocumentChunks)).toHaveBeenCalledOnce();
    expect(vi.mocked(embedDocumentChunks)).toHaveBeenCalledAfter(
      vi.mocked(chunkDocument),
    );
    expect(vi.mocked(embedDocumentChunks)).toHaveBeenCalledWith({
      chunks: mockChunks,
      model: 'cohere.embed-multilingual-v3',
      traceID: expect.any(String),
      userID: 'user456',
    });

    expect(vi.mocked(bulkAddChunks)).toHaveBeenCalledOnce();
    expect(vi.mocked(bulkAddChunks)).toHaveBeenCalledAfter(
      vi.mocked(embedDocumentChunks),
    );
    expect(vi.mocked(bulkAddChunks)).toHaveBeenCalledWith({
      chunks: [
        {
          chunkContent: 'Chunk 1',
          chunkID: 'chunk1',
          documentID: 'doc123',
          embedding: [0.1, 0.2, 0.3],
          spaceID: 'user456',
          userID: 'user456',
        },
        {
          chunkContent: 'Chunk 2',
          chunkID: 'chunk2',
          documentID: 'doc123',
          embedding: [0.4, 0.5, 0.6],
          spaceID: 'user456',
          userID: 'user456',
        },
      ],
    });

    expect(vi.mocked(updateDocument)).toHaveBeenCalledOnce();
    expect(vi.mocked(updateDocument)).toHaveBeenCalledAfter(
      vi.mocked(bulkAddChunks),
    );
    expect(vi.mocked(updateDocument)).toHaveBeenCalledWith({
      documentID: 'doc123',
      status: 'indexed',
      userID: 'user456',
    });

    expect(vi.mocked(analytics.capture)).toHaveBeenCalledTimes(6);
    expect(result).toEqual(mockUpdatedDocument);
  });
});
