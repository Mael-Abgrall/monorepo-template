/* v8 ignore start -- not needed to test, as it actively break them */
import type { Context } from 'hono';
import type { Environment } from 'service-utils/environment';
import { initPostgreSQL } from 'core/config';
import { createMiddleware } from 'hono/factory';
import { flushAnalytics, initAnalyticsClient } from 'service-utils/analytics';
import { setEnvironment } from 'service-utils/environment';
export const environmentMiddleware = createMiddleware(
  async (context: Context, next) => {
    if (context.env) {
      setEnvironment({ env: context.env as Environment });
      initPostgreSQL({ env: context.env as Environment });
      initAnalyticsClient({ env: context.env as Environment });
    }
    await next();
    if (context.env) {
      await flushAnalytics();
    }
  },
);
/* v8 ignore end */
