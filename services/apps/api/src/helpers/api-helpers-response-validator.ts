import { HTTPException } from 'hono/http-exception';
import { getContextLogger } from 'service-utils/logger';
import { Check, Value } from 'shared/typebox';

const logger = getContextLogger('api-helpers-response-validator.ts');

/**
 * Validate the response against the schema
 * @param root named parameters
 * @param root.response The response object to validate
 * @param root.schema The schema to validate the response against
 * @returns The response object
 */
export function validateResponse<T>({
  response,
  schema,
}: {
  response: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is needed by typebox
  schema: any;
}): T {
  const result = Check(schema, response);
  if (!result) {
    const issues = [...Value.Errors(schema, response)];
    logger.error(issues);
    throw new HTTPException(400, {
      cause: issues,
      message: 'Invalid response',
    });
  }
  return response;
}
