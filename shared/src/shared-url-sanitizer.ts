/**
 * Sanitize a URL by removing sensitive information
 * @param root named parameters
 * @param root.url The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl({ url }: { url: string }): string {
  const sensitiveKeys = ['state', 'code'];
  try {
    const urlObject = new URL(url);
    const params = urlObject.searchParams;

    for (const key of sensitiveKeys) {
      if (params.has(key)) {
        params.set(key, 'REDACTED');
      }
    }

    return urlObject.toString();
  } catch {
    return url;
  }
}
