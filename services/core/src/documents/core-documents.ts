import { embedDocumentChunks } from 'ai/embeddings';
import { chunkDocument } from 'ai/utils/chunking';
import {
  bulkAddChunks,
  deleteDocument as deleteDocumentFromDatabase,
  downloadBlob,
  updateDocument,
} from 'database/documents';
import { parseDocument } from 'parser';

export {
  addDocument,
  getDocumentByID,
  getDocumentsBySpaceID,
} from 'database/documents';

/**
 * Delete a document from the search and database
 * @param root named parameters
 * @param root.documentID the ID of the document to delete
 * @param root.userID the owner ID
 */
export async function deleteDocument({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<void> {
  await deleteDocumentFromDatabase({ documentID, userID });
}

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
  const { data, mimeType } = await downloadBlob({ documentID, userID });

  const traceID = crypto.randomUUID();

  const text = await parseDocument({
    binaryStream: data,
    mimeType,
  });

  const chunks = await chunkDocument({
    document: text,
  });

  const chunksWithEmbeddings = await embedDocumentChunks({
    chunks,
    model: 'cohere.embed-multilingual-v3',
    traceID,
    userID,
  });

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

  const updatedDocument = await updateDocument({
    documentID,
    status: 'indexed',
    userID,
  });

  // todo: analytics

  return updatedDocument;
}
