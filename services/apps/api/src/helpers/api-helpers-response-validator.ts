import { HTTPException } from 'hono/http-exception';
import { Check, Value } from 'shared/typebox';

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
    throw new HTTPException(400, {
      cause: [...Value.Errors(schema, response)],
      message: 'Invalid response',
    });
  }
  return response;
}
