import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { Environment } from 'service-utils/environment';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('database-postgresql');

export let pgDatabase: NeonHttpDatabase;

/**
 * Initialize the connection to the PostgreSQL database
 * @param root named parameters
 * @param root.env environment variables
 */
export function initPostgreSQL({ env }: { env: Environment }): void {
  /* v8 ignore start */
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (env.NODE_ENV === 'test') {
    logger.info('Initializing PostgreSQL for test environment');
    const url = env.DATABASE_URL_TEST ?? env.DATABASE_URL;
    const client = neon(url);
    pgDatabase = drizzle(client);
    addExtensions();
  } else {
    logger.info('Initializing PostgreSQL for production environment');
    const client = neon(env.DATABASE_URL);
    pgDatabase = drizzle(client);
    addExtensions();
  }
}

/**
 * Add extensions to the database
 */
function addExtensions(): void {
  pgDatabase.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}
/* v8 ignore end */
