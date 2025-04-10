import type { Environment } from 'service-utils/environment';
import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, vi } from 'vitest';
import {
  conversationsTable,
  messagesTable,
} from '../src/chat/database-chat-schemas';
import { initPostgreSQL, pgDatabase } from '../src/config/database-postgresql';
import {
  documentsTable,
  searchChunksTable,
} from '../src/documents/database-documents-schemas';
import { spaceTable } from '../src/space/database-space-schemas';
import {
  usersTable,
  verificationTokensTable,
} from '../src/user/database-user-schemas';

beforeAll(async () => {
  initPostgreSQL({ env: process.env as unknown as Environment });
});

beforeEach(async () => {
  await pgDatabase.execute(
    sql`
TRUNCATE TABLE 
  ${conversationsTable}, 
  ${documentsTable}, 
  ${searchChunksTable},
  ${messagesTable}, 
  ${spaceTable}, 
  ${usersTable}, 
  ${verificationTokensTable} 
CASCADE`,
  );
  vi.clearAllMocks();
});
