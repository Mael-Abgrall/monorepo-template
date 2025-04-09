import {
  deleteDocument as deleteDocumentFromDatabase,
  downloadBlob,
  updateDocument,
} from 'database/documents';

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
  // await deleteDocumentFromSearch({ documentID, userID });
  await deleteDocumentFromDatabase({ documentID, userID });
}

/**
 * Parse and index a document
 * @param root named parameters
 * @param root.documentID the ID of the document to parse and index
 * @param root.userID the user ID
 */
export async function parseAndIndexDocument({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<Awaited<ReturnType<typeof updateDocument>>> {
  const { data, mimeType } = await downloadBlob({ documentID, userID });

  throw new Error('Not implemented');
  // const traceID = crypto.randomUUID();

  // const text = await parseDocument({
  //   binaryStream: data,
  //   mimeType,
  // });

  // const chunksWithEmbeddings = await embedDocumentChunks({
  //   chunks: textChunks,
  //   traceID,
  // });

  // await addDocumentToSearch({
  //   chunks: chunksWithEmbeddings,
  //   documentID,
  // });

  // await updateDocument({
  //   documentID,
  //   status: 'indexed',
  //   userID,
  // });
}
