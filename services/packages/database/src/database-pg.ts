import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

interface Environment {
  DATABASE_URL?: string;
  DATABASE_URL_TEST?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}

export let pgDatabase: NeonHttpDatabase;

/**
 * Setup the PostgreSQL client
 * @param root named parameters
 * @param root.env the environment variables
 */
export function setupPostgreSQL({ env }: { env: Environment }): void {
  /* v8 ignore start */
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (env.NODE_ENV === 'test') {
    const url = env.DATABASE_URL_TEST ?? env.DATABASE_URL;
    const client = neon(url);
    pgDatabase = drizzle(client);
  } else {
    const client = neon(env.DATABASE_URL);
    pgDatabase = drizzle(client);
  }
}
/* v8 ignore end */
