import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import { createSpace } from '../../../space/database-space';
import {
  deleteDocumentInDatabase,
  insertDocumentInDatabase,
} from '../../database-documents';
import {
  type Chunk,
  searchChunksTable,
} from '../../database-documents-schemas';
import {
  bulkAddChunks,
  textSearch,
  vectorSearch,
} from '../../database-documents-search';

/**
 * Prepare the database for tests
 * @returns the document ID, the mock documents, the space ID and the user ID
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- no
async function prepareDB() {
  const userID = crypto.randomUUID();
  const documentID = crypto.randomUUID();
  const space = await createSpace({
    title: 'test space',
    userID,
  });

  await insertDocumentInDatabase({
    documentID,
    spaceID: space.spaceID,
    title: 'test document',
    userID,
  });

  const mockDocument1: Chunk = {
    chunkContent: 'Document one',
    chunkID: crypto.randomUUID(),
    documentID,
    embedding: Array.from({ length: 1536 }, () => {
      return 0.9;
    }),
    spaceID: space.spaceID,
    userID,
  };

  const mockDocument2: Chunk = {
    chunkContent: 'document two',
    chunkID: crypto.randomUUID(),
    documentID,
    embedding: Array.from({ length: 1536 }, () => {
      return 0.8;
    }),
    spaceID: space.spaceID,
    userID,
  };

  const mockDocument3: Chunk = {
    chunkContent: 'three',
    chunkID: crypto.randomUUID(),
    documentID,
    embedding: Array.from({ length: 1536 }, () => {
      return -0.1;
    }),
    spaceID: space.spaceID,
    userID,
  };

  const mockDocumentFromOtherSpace: Chunk = {
    chunkContent: 'Document from other space',
    chunkID: crypto.randomUUID(),
    documentID,
    embedding: Array.from({ length: 1536 }, () => {
      return 0.9;
    }),
    spaceID: crypto.randomUUID(),
    userID,
  };

  const mockDocumentFromOtherUser: Chunk = {
    chunkContent: 'Document from other user',
    chunkID: crypto.randomUUID(),
    documentID,
    embedding: Array.from({ length: 1536 }, () => {
      return 0.9;
    }),
    spaceID: space.spaceID,
    userID: crypto.randomUUID(),
  };

  return {
    documentID,
    mockDocument1,
    mockDocument2,
    mockDocument3,
    mockDocumentFromOtherSpace,
    mockDocumentFromOtherUser,
    spaceID: space.spaceID,
    userID,
  };
}

describe('bulkAddChunks', () => {
  it('should add chunks to the database', async () => {
    const {
      documentID,
      mockDocument1,
      mockDocument2,
      mockDocument3,
      spaceID,
      userID,
    } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const records = await pgDatabase
      .select()
      .from(searchChunksTable)
      .where(eq(searchChunksTable.documentID, documentID));

    expect(records).toHaveLength(3);
    expect(records[0].chunkID).toBe(mockDocument1.chunkID);
    expect(records[0].chunkContent).toBe(mockDocument1.chunkContent);
    expect(records[0].documentID).toBe(documentID);
    expect(records[0].spaceID).toBe(spaceID);
    expect(records[0].userID).toBe(userID);
    expect(records[1].chunkID).toBe(mockDocument2.chunkID);
    expect(records[1].chunkContent).toBe(mockDocument2.chunkContent);
    expect(records[2].chunkID).toBe(mockDocument3.chunkID);
    expect(records[2].chunkContent).toBe(mockDocument3.chunkContent);
  });

  it('should throw on empty chunks array', async () => {
    await expect(bulkAddChunks({ chunks: [] })).rejects.toThrow();
  });

  it('should throw an error if trying to add chunks with duplicate chunkIDs', async () => {
    const { documentID, spaceID, userID } = await prepareDB();

    const chunkID = crypto.randomUUID();
    const chunks: Chunk[] = [
      {
        chunkContent: 'This is the first chunk of content',
        chunkID,
        documentID,
        embedding: Array.from({ length: 1536 }).fill(0.1) as number[],
        spaceID,
        userID,
      },
      {
        chunkContent: 'This is the second chunk of content',
        chunkID,
        documentID,
        embedding: Array.from({ length: 1536 }).fill(0.2) as number[],
        spaceID,
        userID,
      },
    ];

    await expect(bulkAddChunks({ chunks })).rejects.toThrow();
  });

  it('should throw an error if trying to add chunks for a non-existent document', async () => {
    const { spaceID, userID } = await prepareDB();

    const nonExistentDocumentID = crypto.randomUUID();

    const chunks: Chunk[] = [
      {
        chunkContent: 'This is a chunk for a non-existent document',
        chunkID: crypto.randomUUID(),
        documentID: nonExistentDocumentID,
        embedding: Array.from({ length: 1536 }).fill(0.1) as number[],
        spaceID,
        userID,
      },
    ];

    await expect(bulkAddChunks({ chunks })).rejects.toThrow();
  });
});

describe('Vector search', () => {
  it('should return the correct vector search results', async () => {
    const { mockDocument1, mockDocument2, mockDocument3 } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 100,
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(2);
    expect(result[0].score).toBeGreaterThan(0.99);
    expect(result[1].score).toBeGreaterThan(0.99);
    expect(result[0].chunkContent).toContain('Document one');
    expect(result[1].chunkContent).toContain('document two');
  });

  it('should filter the number of output to number of documents if less than maxResults', async () => {
    const { mockDocument1, mockDocument2, mockDocument3 } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });
    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 1,
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].documentID).toBe(mockDocument1.documentID);
  });

  it('should not return documents from other spaces', async () => {
    const { mockDocument1, mockDocumentFromOtherSpace } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocumentFromOtherSpace],
    });

    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 100,
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].documentID).toBe(mockDocument1.documentID);
  });

  it('should not return documents from other users', async () => {
    const { mockDocument1, mockDocumentFromOtherUser } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocumentFromOtherUser],
    });

    const result = await vectorSearch({
      embedding: Array.from({ length: 1536 }, () => {
        return 0.9;
      }),
      maxResults: 100,
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].documentID).toBe(mockDocument1.documentID);
  });
});

describe('Text search', () => {
  it('should return the correct text search results, with scores', async () => {
    const { mockDocument1, mockDocument2, mockDocument3 } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const result = await textSearch({
      maxResults: 100,
      query: 'one document',
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });
    expect(result.length).toBe(2);
    expect(result[0].chunkContent).toContain('Document one');
    expect(result[1].chunkContent).toContain('document two');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should return the correct fuzzy text search results, with scores', async () => {
    const { mockDocument1, mockDocument2, mockDocument3 } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const result = await textSearch({
      maxResults: 100,
      query: 'documet on',
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(2);
    expect(result[0].chunkContent).toContain('Document one');
    expect(result[1].chunkContent).toContain('document two');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should limit the number of results', async () => {
    const { mockDocument1, mockDocument2, mockDocument3 } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const result = await textSearch({
      maxResults: 1,
      query: 'document',
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].chunkContent).toContain('Document one');
  });

  it('should not return documents from other spaces', async () => {
    const { mockDocument1, mockDocumentFromOtherSpace } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocumentFromOtherSpace],
    });

    const result = await textSearch({
      maxResults: 100,
      query: 'document',
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].chunkContent).toContain('Document one');
  });

  it('should not return documents from other users', async () => {
    const { mockDocument1, mockDocumentFromOtherUser } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocumentFromOtherUser],
    });

    const result = await textSearch({
      maxResults: 100,
      query: 'document',
      spaceID: mockDocument1.spaceID,
      userID: mockDocument1.userID,
    });

    expect(result.length).toBe(1);
    expect(result[0].chunkContent).toContain('Document one');
  });
});

describe('Delete chunks', () => {
  it('should delete chunks when document is deleted, and no longer appear in search', async () => {
    const {
      documentID,
      mockDocument1,
      mockDocument2,
      mockDocument3,
      spaceID,
      userID,
    } = await prepareDB();

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const searchResult = await textSearch({
      maxResults: 100,
      query: 'document',
      spaceID,
      userID,
    });
    expect(searchResult).toHaveLength(2);
    const vectorSearchResult = await vectorSearch({
      embedding: Array.from({ length: 1536 }).fill(0.1) as number[],
      maxResults: 100,
      spaceID,
      userID,
    });
    expect(vectorSearchResult).toHaveLength(2);

    await deleteDocumentInDatabase({ documentID, userID });

    const records = await pgDatabase
      .select()
      .from(searchChunksTable)
      .where(eq(searchChunksTable.documentID, documentID));

    expect(records).toHaveLength(0);

    const searchResultAfterDeletion = await textSearch({
      maxResults: 100,
      query: 'document',
      spaceID,
      userID,
    });
    expect(searchResultAfterDeletion).toHaveLength(0);
    const vectorSearchResultAfterDeletion = await vectorSearch({
      embedding: Array.from({ length: 1536 }).fill(0.1) as number[],
      maxResults: 100,
      spaceID,
      userID,
    });
    expect(vectorSearchResultAfterDeletion).toHaveLength(0);
  });
});
