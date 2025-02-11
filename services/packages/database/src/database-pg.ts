import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

interface Environment {
  DATABASE_URL?: string;
  DATABASE_URL_TEST?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}

/**
 * Get the PostgreSQL client
 * @param root named parameters
 * @param root.env the environment variables
 * @returns the drizzle client
 */
export function getPostgreSQL({ env }: { env: Environment }): NeonHttpDatabase {
  /* v8 ignore start */
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (env.NODE_ENV === 'test') {
    const url = env.DATABASE_URL_TEST ?? env.DATABASE_URL;
    const client = neon(url);
    return drizzle(client);
  }

  const client = neon(env.DATABASE_URL);
  return drizzle(client);
}
/* v8 ignore end */
