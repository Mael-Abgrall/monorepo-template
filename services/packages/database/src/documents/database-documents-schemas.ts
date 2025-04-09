import type { InferSelectModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';
import { spaceTable } from '../space/database-space-schemas';

export type DocumentStatus =
  | 'error'
  | 'indexed'
  | 'pendingIndexing'
  | 'uploading';

export const documentsTable = pgTable('documents', {
  documentID: uuid('document_id').primaryKey().notNull(),
  spaceID: uuid('space_id'), // should not cascade, because we need to also scrap the blobs
  status: text('status').notNull().default('uploading').$type<DocumentStatus>(),
  title: text('title').notNull(),
  userID: uuid('user_id').notNull(),
});
export type Document = NullToUndefined<typeof documentsTable.$inferSelect>;

// export const searchChunksTable = pgTable(
//   'search_chunks',
//   {
//     chunkContent: text('chunk_content').notNull(),
//     chunkID: integer('chunk_id').notNull(),
//     documentID: uuid('document_id')
//       .notNull()
//       .references(() => {
//         return documentsTable.documentID;
//       }),
//     embedding: vector('embedding', {
//       dimensions: 1536,
//     }).notNull(),
//   },
//   (table) => {
//     return [
//       index('embeddingIndex').using(
//         'hnsw',
//         table.embedding.op('vector_cosine_ops'),
//       ),
//       index('chunk_text_search').using(
//         'gin',
//         sql`to_tsvector('english', ${table.chunkContent})`,
//       ),
//     ];
//   },
// );
// export type Chunk = InferSelectModel<typeof searchChunksTable>;
