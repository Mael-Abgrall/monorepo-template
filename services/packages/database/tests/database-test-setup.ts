import type { Environment } from 'service-utils/environment';
import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, vi } from 'vitest';
import {
  conversationsTable,
  messagesTable,
} from '../src/chat/database-chat-schemas';
import { initPostgreSQL, pgDatabase } from '../src/config/database-postgresql';
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
  ${messagesTable}, 
  ${usersTable}, 
  ${verificationTokensTable} 
CASCADE`,
  );
  vi.clearAllMocks();
});
