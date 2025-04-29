import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { analytics } from 'service-utils/analytics';
import { getContextLogger } from 'service-utils/logger';

const logger = getContextLogger('api-middleware-errors.ts');

export const errorHandler = (
  error: Error | HTTPException,
  context: Context,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- later
) => {
  if (error instanceof HTTPException) {
    return context.text(error.message, error.status);
  }
  logger.error(error);
  analytics.captureException(error, 'anonymous', {
    url: context.req.url,
  });
  return context.text('Internal Server Error', 500);
};
