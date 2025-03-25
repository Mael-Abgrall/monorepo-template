import { PostHog } from 'posthog-node';
import type { Environment } from './environment.js';

export let analytics: PostHog;

/* v8 ignore start */
/**
 * Shutdown the analytics client
 */
export async function flushAnalytics(): Promise<void> {
  await analytics.shutdown();
}
/* v8 ignore end */

/* v8 ignore start */
/**
 * Get the analytics client
 * @param root named parameters
 * @param root.env the environment variables
 */
export function initAnalyticsClient({ env }: { env: Environment }): void {
  if (!env.POSTHOG_KEY) {
    throw new Error('POSTHOG_KEY is not set');
  }

  const posthog = new PostHog(env.POSTHOG_KEY, {
    enableExceptionAutocapture: true,
    fetch: fetch.bind(globalThis),
    host: 'https://eu.i.posthog.com',
    privacyMode: true,
  });
  analytics = posthog;
}
/* v8 ignore end */
