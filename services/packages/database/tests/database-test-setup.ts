import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach } from 'vitest';
import { pgDatabase, setupPostgreSQL } from '../src/database-pg';
import { usersTable } from '../src/user/database-user-schemas';

beforeAll(async () => {
  setupPostgreSQL({ env: process.env });
});

beforeEach(async () => {
  await pgDatabase.execute(sql`TRUNCATE TABLE ${usersTable}`);
});
