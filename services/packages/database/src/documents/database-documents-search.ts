import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { pgDatabase } from '../config/database-postgresql';
import { type Chunk, searchChunksTable } from './database-documents-schemas';

/**
 * Bulk add chunks to the search
 * @param root named parameters
 * @param root.chunks the chunks to add
 */
export async function bulkAddChunks({
  chunks,
}: {
  chunks: Chunk[];
}): Promise<void> {
  await pgDatabase.insert(searchChunksTable).values(chunks).execute();
}

/**
 * Search in the chunk text index for similar text
 * @param root named parameters
 * @param root.maxResults the maximum number of results
 * @param root.query the query to search for
 * @param root.spaceID the space ID
 * @param root.userID the user ID
 * @returns a sorted array of chunks with scores
 */
export async function textSearch({
  maxResults,
  query,
  spaceID,
  userID,
}: {
  maxResults: number;
  query: string;
  spaceID: string;
  userID: string;
}): Promise<
  { chunkContent: string; chunkID: string; documentID: string; score: number }[]
> {
  const queryResult = await pgDatabase.execute(
    sql`
SELECT chunk_content, chunk_id, document_id, paradedb.score(chunk_id)
FROM search_chunks
WHERE chunk_id @@@ paradedb.boolean(
  must => ARRAY[
    paradedb.term('space_id', ${spaceID}),
    paradedb.term('user_id', ${userID}),
    paradedb.match('chunk_content', ${query}, distance => 1)
  ]
)
ORDER BY paradedb.score(chunk_id) DESC
LIMIT ${maxResults};
`,
  );

  return queryResult.rows.map((row) => {
    return {
      chunkContent: row.chunk_content as string,
      chunkID: row.chunk_id as string,
      documentID: row.document_id as string,
      score: row.score as number,
    };
  });
}

/**
 * Search in the chunk vector index for similar embeddings
 * @param root named parameters
 * @param root.embedding the embedding of the query
 * @param root.maxResults the maximum number of results
 * @param root.spaceID the space ID
 * @param root.userID the user ID
 * @returns a sorted array with scores
 */
export async function vectorSearch({
  embedding,
  maxResults,
  spaceID,
  userID,
}: {
  embedding: number[];
  maxResults: number;
  spaceID: string;
  userID: string;
}): Promise<
  {
    chunkContent: string;
    chunkID: string;
    documentID: string;
    score: number;
  }[]
> {
  const distance = sql<number>`1 - (${cosineDistance(searchChunksTable.embedding, embedding)})`;
  const records = await pgDatabase
    .select({
      chunkContent: searchChunksTable.chunkContent,
      chunkID: searchChunksTable.chunkID,
      documentID: searchChunksTable.documentID,
      score: distance,
    })
    .from(searchChunksTable)
    .where(
      and(
        gt(distance, 0.5),
        eq(searchChunksTable.spaceID, spaceID),
        eq(searchChunksTable.userID, userID),
      ),
    )
    .orderBy(desc(distance))
    .limit(maxResults)
    .execute();

  return records;
}
