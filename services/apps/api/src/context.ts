import type { getPostgreSQL } from 'database/postgresql';

export interface Environment {
  DATABASE_URL: string;
}
export interface Variables {
  pgDatabase: ReturnType<typeof getPostgreSQL>;
}
