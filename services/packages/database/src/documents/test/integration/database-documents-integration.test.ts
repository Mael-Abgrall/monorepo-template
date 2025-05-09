import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../database-documents-schemas';
import { pgDatabase } from '../../../config/database-postgresql';
import { createSpace } from '../../../space/database-space';
import {
  deleteDocumentInDatabase,
  getDocumentByID,
  getDocumentsBySpaceID,
  getDocumentWithContent,
  insertDocumentInDatabase,
  updateDocumentInDatabase,
} from '../../database-documents';
import { documentsTable } from '../../database-documents-schemas';
import { bulkAddChunks } from '../../database-documents-search';

const document = {
  documentID: crypto.randomUUID(),
  title: 'test',
  userID: crypto.randomUUID(),
};

describe('insertDocument', () => {
  it('should insert a document', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });

    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });

    const records = await pgDatabase.select().from(documentsTable);

    expect(records).toHaveLength(1);
    expect(records[0].documentID).toBe(document.documentID);
    expect(records[0].spaceID).toBe(space.spaceID);
    expect(records[0].title).toBe(document.title);
    expect(records[0].userID).toBe(document.userID);
  });

  it('should throw an error if the document already exists', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    await expect(
      insertDocumentInDatabase({ ...document, spaceID: space.spaceID }),
    ).rejects.toThrow();
  });

  it('should throw an error if the space does not exist', async () => {
    await expect(
      insertDocumentInDatabase({ ...document, spaceID: crypto.randomUUID() }),
    ).rejects.toThrow();
  });
});

describe('getDocumentByID', () => {
  it('should return the document', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });

    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });

    expect(record?.documentID).toBe(document.documentID);
    expect(record?.title).toBe(document.title);
    expect(record?.status).toBe('uploading');
  });

  it('should return undefined if the document does not exist', async () => {
    const record = await getDocumentByID({
      documentID: crypto.randomUUID(),
      userID: document.userID,
    });
    expect(record).toBeUndefined();
  });

  it('should not return the document of other users', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: crypto.randomUUID(),
    });
    expect(record).toBeUndefined();
  });

  it('should return undefined if the space does not exist', async () => {
    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });
    expect(record).toBeUndefined();
  });
});

describe('getDocumentsBySpaceID', () => {
  it('should return all documents in the space', async () => {
    const space = await createSpace({
      title: 'test space',
      userID: document.userID,
    });

    const document1 = {
      documentID: crypto.randomUUID(),
      spaceID: space.spaceID,
      title: 'document 1',
      userID: document.userID,
    };

    const document2 = {
      documentID: crypto.randomUUID(),
      spaceID: space.spaceID,
      title: 'document 2',
      userID: document.userID,
    };

    await insertDocumentInDatabase(document1);
    await insertDocumentInDatabase(document2);

    const documents = await getDocumentsBySpaceID({
      spaceID: space.spaceID,
      userID: document.userID,
    });

    expect(documents).toHaveLength(2);
    expect(documents[0].documentID).toBe(document1.documentID);
    expect(documents[1].documentID).toBe(document2.documentID);
    expect(
      documents.every((d) => {
        return d.spaceID === space.spaceID;
      }),
    ).toBe(true);
  });

  it('should return an empty array if no documents exist in the space', async () => {
    const emptySpace = await createSpace({
      title: 'empty space',
      userID: document.userID,
    });

    const documents = await getDocumentsBySpaceID({
      spaceID: emptySpace.spaceID,
      userID: document.userID,
    });

    expect(documents).toHaveLength(0);
  });

  it('should not return documents from another space', async () => {
    const space1 = await createSpace({
      title: 'space 1',
      userID: document.userID,
    });
    const space2 = await createSpace({
      title: 'space 2',
      userID: document.userID,
    });

    const document1 = {
      documentID: crypto.randomUUID(),
      spaceID: space1.spaceID,
      title: 'document in space 1',
      userID: document.userID,
    };

    await insertDocumentInDatabase(document1);

    const documents = await getDocumentsBySpaceID({
      spaceID: space2.spaceID,
      userID: document.userID,
    });

    expect(documents).toHaveLength(0);
  });

  it('should return an empty array for an invalid space ID', async () => {
    const invalidSpaceID = crypto.randomUUID();
    const documents = await getDocumentsBySpaceID({
      spaceID: invalidSpaceID,
      userID: document.userID,
    });

    expect(documents).toHaveLength(0);
  });

  it('should not return documents from another user', async () => {
    const space = await createSpace({
      title: 'test space',
      userID: document.userID,
    });

    const userDocument = {
      documentID: crypto.randomUUID(),
      spaceID: space.spaceID,
      title: 'user document',
      userID: document.userID,
    };

    const otherUserID = crypto.randomUUID();
    const otherUserDocument = {
      documentID: crypto.randomUUID(),
      spaceID: space.spaceID,
      title: 'other user document',
      userID: otherUserID,
    };

    await insertDocumentInDatabase(userDocument);
    await insertDocumentInDatabase(otherUserDocument);

    const documents = await getDocumentsBySpaceID({
      spaceID: space.spaceID,
      userID: document.userID,
    });

    expect(documents).toHaveLength(1);
    expect(documents[0].documentID).toBe(userDocument.documentID);
    expect(documents[0].userID).toBe(document.userID);

    const allDocuments = await pgDatabase
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.spaceID, space.spaceID));

    expect(allDocuments).toHaveLength(2);
    expect(allDocuments[0].documentID).toBe(userDocument.documentID);
    expect(allDocuments[1].documentID).toBe(otherUserDocument.documentID);
  });
});

describe('deleteDocument', () => {
  it('should delete the document', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    await deleteDocumentInDatabase({
      documentID: document.documentID,
      userID: document.userID,
    });

    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });
    expect(record).toBeUndefined();
  });

  it('should not delete the document of other users', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    await deleteDocumentInDatabase({
      documentID: document.documentID,
      userID: crypto.randomUUID(),
    });

    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });
    expect(record).toBeDefined();
  });

  it('should return undefined if the space does not exist', async () => {
    await deleteDocumentInDatabase({
      documentID: document.documentID,
      userID: document.userID,
    });

    expect(true).toBe(true); // pass if the function does not throw
  });
});

describe('updateDocument', () => {
  it('should update the document and return it', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });

    const record = await updateDocumentInDatabase({
      documentID: document.documentID,
      status: 'indexed',
      title: 'new title',
      userID: document.userID,
    });

    expect(record.status).toBe('indexed');
    expect(record.title).toBe('new title');
  });

  it('should not update another user document', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    await expect(
      updateDocumentInDatabase({
        documentID: document.documentID,
        status: 'indexed',
        userID: crypto.randomUUID(),
      }),
    ).rejects.toThrow();

    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });
    expect(record?.status).toBe('uploading');
  });

  it('should ignore undefined values', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });

    await updateDocumentInDatabase({
      documentID: document.documentID,
      status: undefined,
      title: 'new title',
      userID: document.userID,
    });

    const record = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });

    expect(record?.status).toBe('uploading');
    expect(record?.title).toEqual('new title');

    await updateDocumentInDatabase({
      documentID: document.documentID,
      status: 'indexed',
      title: undefined,
      userID: document.userID,
    });

    const record2 = await getDocumentByID({
      documentID: document.documentID,
      userID: document.userID,
    });

    expect(record2?.status).toBe('indexed');
    expect(record2?.title).toBe('new title');

    await updateDocumentInDatabase({
      documentID: document.documentID,
      status: 'error',
      userID: document.userID,
    });
  });

  it('should throw if the space does not exist', async () => {
    await expect(
      updateDocumentInDatabase({
        documentID: document.documentID,
        status: 'indexed',
        userID: document.userID,
      }),
    ).rejects.toThrow();
  });
});

describe('getDocumentWithContent', () => {
  it('should return the document and the chunks', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });

    const mockDocument1: Chunk = {
      chunkContent: 'Document one',
      chunkID: crypto.randomUUID(),
      documentID: document.documentID,
      embedding: Array.from({ length: 1024 }, () => {
        return 0.9;
      }),
      spaceID: space.spaceID,
      userID: document.userID,
    };

    const mockDocument2: Chunk = {
      chunkContent: 'document two',
      chunkID: crypto.randomUUID(),
      documentID: document.documentID,
      embedding: Array.from({ length: 1024 }, () => {
        return 0.8;
      }),
      spaceID: space.spaceID,
      userID: document.userID,
    };

    const mockDocument3: Chunk = {
      chunkContent: 'three',
      chunkID: crypto.randomUUID(),
      documentID: document.documentID,
      embedding: Array.from({ length: 1024 }, () => {
        return -0.1;
      }),
      spaceID: space.spaceID,
      userID: document.userID,
    };

    await bulkAddChunks({
      chunks: [mockDocument1, mockDocument2, mockDocument3],
    });

    const record = await getDocumentWithContent({
      documentID: document.documentID,
      userID: document.userID,
    });

    expect(record?.documentID).toBe(document.documentID);
    expect(record?.title).toBe(document.title);
    expect(record?.status).toBe('uploading');
    expect(record?.content).toBeDefined();
    expect(record?.content).toHaveLength(3);
    expect(record?.content).toEqual([
      mockDocument1.chunkContent,
      mockDocument2.chunkContent,
      mockDocument3.chunkContent,
    ]);
  });

  it('should return undefined if the document does not exist', async () => {
    const record = await getDocumentWithContent({
      documentID: crypto.randomUUID(),
      userID: document.userID,
    });
    expect(record).toBeUndefined();
  });

  it('should not return the document of other users', async () => {
    const space = await createSpace({ title: 'test', userID: document.userID });
    await insertDocumentInDatabase({ ...document, spaceID: space.spaceID });
    const record = await getDocumentWithContent({
      documentID: document.documentID,
      userID: crypto.randomUUID(),
    });
    expect(record).toBeUndefined();
  });

  it('should return undefined if the space does not exist', async () => {
    const record = await getDocumentWithContent({
      documentID: document.documentID,
      userID: document.userID,
    });
    expect(record).toBeUndefined();
  });
});
