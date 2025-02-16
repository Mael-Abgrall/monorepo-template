// Cloudflare workers don't have global variables like node does. This file tries to make them still available.

export interface Environment {
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  COOKIE_SECRET: string;
  DATABASE_URL: string;
  DATABASE_URL_TEST?: string;
  DOMAIN: string;
  GOOGLE_APP_ID: string;
  GOOGLE_APP_SECRET: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}
export let ENVIRONMENT: Environment;

/**
 * Get the frontend url based on the domain env variable
 * @returns the frontend url
 */
export function getFrontendUrl(): string {
  return ENVIRONMENT.DOMAIN === 'localhost'
    ? 'http://localhost:5173'
    : `https://${ENVIRONMENT.DOMAIN}`;
}

/**
 * Set the environment variables as global variables
 * @param root named parameters
 * @param root.env the environment variables
 */
export function setEnvironment({ env }: { env: Environment }): void {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!env.DOMAIN) {
    throw new Error('DOMAIN is not set');
  }
  if (!env.GOOGLE_APP_ID) {
    throw new Error('GOOGLE_APP_ID is not set');
  }
  if (!env.GOOGLE_APP_SECRET) {
    throw new Error('GOOGLE_APP_SECRET is not set');
  }
  if (!env.MICROSOFT_CLIENT_ID) {
    throw new Error('MICROSOFT_CLIENT_ID is not set');
  }
  if (!env.MICROSOFT_CLIENT_SECRET) {
    throw new Error('MICROSOFT_CLIENT_SECRET is not set');
  }
  if (!env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET is not set');
  }
  ENVIRONMENT = env;
}
