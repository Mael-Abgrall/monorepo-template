import { index, pgTable, text, uuid, vector } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';
import { spaceTable } from '../space/database-space-schemas';

export type DocumentStatus =
  | 'error'
  | 'indexed'
  | 'pendingIndexing'
  | 'uploading';

export const documentsTable = pgTable('documents', {
  documentID: uuid('document_id').primaryKey().notNull(),
  spaceID: uuid('space_id')
    .notNull()
    .references(() => {
      return spaceTable.spaceID;
    }), // should not cascade, because we need to also scrap the blobs
  status: text('status').notNull().default('uploading').$type<DocumentStatus>(),
  title: text('title').notNull(),
  userID: uuid('user_id').notNull(),
});
export type Document = NullToUndefined<typeof documentsTable.$inferSelect>;

export const searchChunksTable = pgTable(
  'search_chunks',
  {
    chunkContent: text('chunk_content').notNull(),
    chunkID: uuid('chunk_id').primaryKey().notNull(),
    documentID: uuid('document_id')
      .notNull()
      .references(
        () => {
          return documentsTable.documentID;
        },
        {
          onDelete: 'cascade',
        },
      ),
    embedding: vector('embedding', {
      dimensions: 1024,
    }).notNull(),
    spaceID: uuid('space_id').notNull(),
    userID: uuid('user_id').notNull(),
  },
  (table) => {
    return [
      index('embeddingIndex').using(
        'hnsw',
        table.embedding.op('vector_cosine_ops'),
      ),
      /** Doc: https://docs.paradedb.com/documentation/indexing/create_index */
      index('item_search_idx')
        .using(
          'bm25',
          table.chunkID,
          table.chunkContent,
          table.spaceID,
          table.userID,
        )
        .with({
          key_field: 'chunk_id',
          // todo: contact support why this doesn't work
          // text_fields: '{"space_id": {"fast": true},"user_id": {"fast": true}}',
        }),
    ];
  },
);

export type Chunk = NullToUndefined<typeof searchChunksTable.$inferSelect>;
