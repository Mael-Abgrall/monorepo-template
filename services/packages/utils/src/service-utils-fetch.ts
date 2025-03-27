import { ofetch } from 'shared/fetch';

export interface ServerFetchError extends Error {
  data?: unknown;
  headers?: { [key: string]: string };
  options?: unknown;
  status?: number;
  statusText?: string;
  url?: string;
}

/**
 * Sanitize options by redacting sensitive data from the body
 * @param root named parameters
 * @param root.options the options object to sanitize
 * @returns the sanitized options
 */
function sanitizeOptions({ options }: { options: unknown }): unknown {
  if (
    options &&
    typeof options === 'object' &&
    'body' in options &&
    options.body &&
    typeof options.body === 'object' &&
    options.body instanceof URLSearchParams
  ) {
    for (const key of options.body.keys()) {
      if (
        key === 'code' ||
        key === 'id_token' ||
        key === 'access_token' ||
        key === 'client_secret' ||
        key === 'client_id'
      ) {
        options.body.set(key, 'REDACTED');
      }
    }
  }
  return options;
}

/**
 * Sanitize a URL by redacting sensitive data from the query string
 * @param root named parameters
 * @param root.url the url to sanitize
 * @returns the sanitized url
 */
function sanitizeURL({ url }: { url: string }): string {
  const urlObject = new URL(url);
  for (const key of urlObject.searchParams.keys()) {
    if (
      key === 'code' ||
      key === 'id_token' ||
      key === 'access_token' ||
      key === 'client_secret' ||
      key === 'client_id'
    ) {
      urlObject.searchParams.set(key, 'REDACTED');
    }
  }
  return urlObject.toString();
}

/**
 * An instance of ofetch that is configured to censor sensitive data from the request and response.
 * To use in backend services.
 */
const serverFetch = ofetch.create({
  onRequestError: ({ error, request }) => {
    const sanitizedUrl = sanitizeURL({ url: request as string });
    const message = `Fetch error: ${error.message} ${sanitizedUrl}`;
    throw new Error(message, { cause: error });
  },

  onResponseError: async ({ options, request, response }) => {
    const sanitizedUrl = sanitizeURL({ url: request as string });
    const message = `Fetch error: ${response.status} [${options.method}] ${sanitizedUrl}`;
    const error = new Error(message) as ServerFetchError;
    error.url = sanitizedUrl;
    error.status = response.status;
    error.statusText = response.statusText;
    // eslint-disable-next-line no-underscore-dangle -- not our code
    error.data = response._data;
    error.headers = Object.fromEntries(response.headers.entries());
    error.options = sanitizeOptions({ options });
    throw error;
  },
});

export { serverFetch };
