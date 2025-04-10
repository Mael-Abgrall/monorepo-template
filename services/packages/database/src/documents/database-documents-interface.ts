import type { Document } from './database-documents-schemas';
import {
  deleteDocumentInDatabase,
  insertDocumentInDatabase,
  updateDocumentInDatabase,
} from './database-documents';
import { deleteBlob, uploadBlob } from './database-documents-blob';

/**
 * add a document to the database
 * @param root named parameters
 * @param root.binaryStream the binary stream of the document
 * @param root.documentID the document ID
 * @param root.mimeType the mime type of the document
 * @param root.spaceID the space ID
 * @param root.title the title of the document
 * @param root.userID the user ID
 * @returns the document or undefined if it failed
 */
export async function addDocument({
  binaryStream,
  documentID,
  mimeType,
  spaceID,
  title,
  userID,
}: {
  binaryStream: Buffer;
  documentID: string;
  mimeType: string;
  spaceID: string | undefined;
  title: string;
  userID: string;
}): Promise<Document | undefined> {
  await insertDocumentInDatabase({
    documentID,
    spaceID,
    title,
    userID,
  });

  const success = await uploadBlob({
    data: binaryStream,
    documentID,
    mimeType,
    userID,
  });
  if (!success) {
    await deleteDocumentInDatabase({ documentID, userID });
    return undefined;
  }

  const document = await updateDocumentInDatabase({
    documentID,
    status: 'pendingIndexing',
    userID,
  });
  return document;
}

/**
 * Delete a document from the various indexes
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.userID the user ID
 */
export async function deleteDocument({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<void> {
  await deleteBlob({ documentID, userID });
  await deleteDocumentInDatabase({ documentID, userID });
}

export {
  getDocumentByID,
  getDocumentsBySpaceID,
  updateDocumentInDatabase as updateDocument,
} from './database-documents';
export { downloadBlob } from './database-documents-blob';
export {
  bulkAddChunks,
  textSearch,
  vectorSearch,
} from './database-documents-search';
