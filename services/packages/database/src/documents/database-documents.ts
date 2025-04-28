import { and, eq } from 'drizzle-orm';
import type {
  Document,
  DocumentWithContent,
} from './database-documents-schemas';
import { pgDatabase } from '../config/database-postgresql.js';
import {
  documentsTable,
  searchChunksTable,
} from './database-documents-schemas';

/**
 * delete a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.userID the user ID
 */
export async function deleteDocumentInDatabase({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<void> {
  await pgDatabase
    .delete(documentsTable)
    .where(
      and(
        eq(documentsTable.documentID, documentID),
        eq(documentsTable.userID, userID),
      ),
    );
}

/**
 * get a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.userID the user ID
 * @returns the document or undefined if it does not exist
 */
export async function getDocumentByID({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<Document | undefined> {
  const records = await pgDatabase
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.documentID, documentID),
        eq(documentsTable.userID, userID),
      ),
    );

  if (records.length === 0) {
    return undefined;
  }

  return { ...records[0], spaceID: records[0].spaceID };
}

/**
 * Get all documents by space ID
 * @param root named parameters
 * @param root.spaceID the space ID
 * @param root.userID the user ID to filter by
 * @returns array of documents that belong to the specified space
 */
export async function getDocumentsBySpaceID({
  spaceID,
  userID,
}: {
  spaceID: string;
  userID: string;
}): Promise<Document[]> {
  const records = await pgDatabase
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.spaceID, spaceID),
        eq(documentsTable.userID, userID),
      ),
    );

  return records as Document[]; // all spaceIDs are defined in this query
}

/**
 * get a document and it's extracted content
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.userID the user ID
 * @returns the document or undefined if it does not exist
 */
export async function getDocumentWithContent({
  documentID,
  userID,
}: {
  documentID: string;
  userID: string;
}): Promise<DocumentWithContent | undefined> {
  const records = await pgDatabase
    .select()
    .from(documentsTable)
    .innerJoin(
      searchChunksTable,
      eq(searchChunksTable.documentID, documentsTable.documentID),
    )
    .where(
      and(
        eq(documentsTable.documentID, documentID),
        eq(documentsTable.userID, userID),
      ),
    );

  if (records.length === 0) {
    return undefined;
  }

  const document = records[0].documents;
  const content = records.map((record) => {
    return record.search_chunks.chunkContent;
  });

  return { ...document, content };
}

/**
 * Insert a document into the database
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.title the title of the document
 * @param root.spaceID (optional, if the document belong to a space) the space ID
 * @param root.userID the user ID
 */
export async function insertDocumentInDatabase({
  documentID,
  spaceID,
  title,
  userID,
}: {
  documentID: string;
  spaceID: string;
  title: string;
  userID: string;
}): Promise<void> {
  await pgDatabase.insert(documentsTable).values({
    documentID,
    spaceID,
    title,
    userID,
  });
}

/**
 * update a document by ID
 * @param root named parameters
 * @param root.documentID the document ID
 * @param root.status the status of the document
 * @param root.title the title of the document
 * @param root.userID the user ID
 * @returns the updated document
 */
export async function updateDocumentInDatabase({
  documentID,
  status,
  title,
  userID,
}: {
  documentID: string;
  status?: Document['status'];
  title?: Document['title'];
  userID: string;
}): Promise<Document> {
  const record = await pgDatabase
    .update(documentsTable)
    .set({ status, title })
    .where(
      and(
        eq(documentsTable.documentID, documentID),
        eq(documentsTable.userID, userID),
      ),
    )
    .returning();
  if (record.length === 0) {
    throw new Error('Document not found');
  }
  return { ...record[0], spaceID: record[0].spaceID };
}
