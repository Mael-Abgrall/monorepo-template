import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

export type DocumentStatus =
  | 'error'
  | 'indexed'
  | 'pendingIndexing'
  | 'uploading';

export const documentsTable = pgTable('documents', {
  documentID: uuid('document_id').primaryKey().notNull(),
  metadata: jsonb('metadata').notNull(),
  spaceID: uuid('space_id'),
  status: text('status').notNull().default('uploading').$type<DocumentStatus>(),
  title: text('title'),
  userID: uuid('user_id').notNull(),
});

export type Document = InferSelectModel<typeof documentsTable>;
export type DocumentInsert = InferInsertModel<typeof documentsTable>;

export const searchChunksTable = pgTable(
  'search_chunks',
  {
    chunkContent: text('chunk_content').notNull(),
    chunkID: integer('chunk_id').notNull(),
    documentID: uuid('document_id')
      .notNull()
      .references(() => {
        return documentsTable.documentID;
      }),
    embedding: vector('embedding', {
      dimensions: 1536,
    }).notNull(),
  },
  (table) => {
    return [
      index('embeddingIndex').using(
        'hnsw',
        table.embedding.op('vector_cosine_ops'),
      ),
      index('chunk_text_search').using(
        'gin',
        sql`to_tsvector('english', ${table.chunkContent})`,
      ),
    ];
  },
);

export type Chunk = InferSelectModel<typeof searchChunksTable>;
