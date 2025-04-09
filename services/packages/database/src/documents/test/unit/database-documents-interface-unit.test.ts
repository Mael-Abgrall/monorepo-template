import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '../../database-documents-schemas';
import {
  deleteDocumentInDatabase,
  insertDocumentInDatabase,
  updateDocumentInDatabase,
} from '../../database-documents';
import { deleteBlob, uploadBlob } from '../../database-documents-blob';
import {
  addDocument,
  deleteDocument,
} from '../../database-documents-interface';

vi.mock('../../database-documents-blob', () => {
  return {
    deleteBlob: vi.fn(),
    uploadBlob: vi.fn(),
  };
});

vi.mock('../../database-documents', () => {
  return {
    deleteDocumentInDatabase: vi.fn(),
    insertDocumentInDatabase: vi.fn(),
    updateDocumentInDatabase: vi.fn(),
  };
});

describe('database-documents-interface', () => {
  const mockDocument: Document = {
    documentID: 'test-doc-id',
    spaceID: 'test-space-id',
    status: 'pendingIndexing',
    title: 'Test Document',
    userID: 'test-user-id',
  };

  const testParameters = {
    binaryStream: Buffer.from('test data'),
    documentID: 'test-doc-id',
    mimeType: 'application/pdf',
    spaceID: 'test-space-id',
    title: 'Test Document',
    userID: 'test-user-id',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDocument', () => {
    it('should add document to DB, upload blob, and update status', async () => {
      vi.mocked(insertDocumentInDatabase).mockResolvedValue(undefined);
      vi.mocked(uploadBlob).mockResolvedValue(true);
      vi.mocked(updateDocumentInDatabase).mockResolvedValue(mockDocument);

      const result = await addDocument(testParameters);

      expect(insertDocumentInDatabase).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        spaceID: testParameters.spaceID,
        title: testParameters.title,
        userID: testParameters.userID,
      });

      expect(uploadBlob).toHaveBeenCalledWith({
        data: testParameters.binaryStream,
        documentID: testParameters.documentID,
        mimeType: testParameters.mimeType,
        userID: testParameters.userID,
      });

      expect(updateDocumentInDatabase).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        status: 'pendingIndexing',
        userID: testParameters.userID,
      });

      expect(result).toEqual(mockDocument);

      // @ts-expect-error -- not a problem
      expect(uploadBlob).toHaveBeenCalledAfter(insertDocumentInDatabase);
      // @ts-expect-error -- not a problem
      expect(updateDocumentInDatabase).toHaveBeenCalledAfter(uploadBlob);
    });

    it('should remove document from DB if blob upload fails', async () => {
      vi.mocked(insertDocumentInDatabase).mockResolvedValue(undefined);
      vi.mocked(uploadBlob).mockResolvedValue(false);
      vi.mocked(deleteDocumentInDatabase).mockResolvedValue(undefined);

      const result = await addDocument(testParameters);

      expect(insertDocumentInDatabase).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        spaceID: testParameters.spaceID,
        title: testParameters.title,
        userID: testParameters.userID,
      });

      expect(uploadBlob).toHaveBeenCalledWith({
        data: testParameters.binaryStream,
        documentID: testParameters.documentID,
        mimeType: testParameters.mimeType,
        userID: testParameters.userID,
      });

      expect(deleteDocumentInDatabase).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        userID: testParameters.userID,
      });

      expect(updateDocumentInDatabase).not.toHaveBeenCalled();

      expect(result).toBeUndefined();

      // @ts-expect-error -- not a problem
      expect(deleteDocumentInDatabase).toHaveBeenCalledAfter(uploadBlob);
    });
  });

  describe('deleteDocument', () => {
    it('should delete both blob and document from DB', async () => {
      vi.mocked(deleteBlob).mockResolvedValue(undefined);
      vi.mocked(deleteDocumentInDatabase).mockResolvedValue(undefined);

      await deleteDocument({
        documentID: testParameters.documentID,
        userID: testParameters.userID,
      });

      expect(deleteBlob).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        userID: testParameters.userID,
      });

      expect(deleteDocumentInDatabase).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        userID: testParameters.userID,
      });

      // @ts-expect-error -- not a problem
      expect(deleteDocumentInDatabase).toHaveBeenCalledAfter(deleteBlob);
    });

    it('should throw error if blob deletion fails', async () => {
      const deleteError = new Error('Blob deletion error');
      vi.mocked(deleteBlob).mockRejectedValue(deleteError);

      await expect(
        deleteDocument({
          documentID: testParameters.documentID,
          userID: testParameters.userID,
        }),
      ).rejects.toThrow('Blob deletion error');

      expect(deleteBlob).toHaveBeenCalledWith({
        documentID: testParameters.documentID,
        userID: testParameters.userID,
      });

      expect(deleteDocumentInDatabase).not.toHaveBeenCalled();
    });
  });
});
