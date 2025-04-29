/**
 * Calculate backoff time with exponential strategy and jitter
 * @param root named parameters
 * @param root.baseDelayMs The base delay in milliseconds (default to 1s)
 * @param root.maxDelayMs The maximum delay in milliseconds (default to 10s)
 * @param root.retryAttempt The current retry attempt (0-based)
 * @returns The backoff time in milliseconds
 */
export function calculateBackoffTime({
  baseDelayMs = 1000,
  maxDelayMs = 10_000,
  retryAttempt,
}: {
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryAttempt: number;
}): number {
  const exponentialDelay = Math.pow(2, retryAttempt) * baseDelayMs;
  // eslint-disable-next-line sonarjs/pseudo-random -- this random value is not sensitive
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

/**
 * Formats a JavaScript Date object into "DD Mon YY" format.
 * @param root named parameters
 * @param root.date - The date object to format.
 * @returns The formatted date string.
 */
export function formatDateToDDMonYY({ date }: { date: Date | string }): string {
  const dateObject = new Date(date);

  const day = dateObject.getDate();
  // Use 'en-US' locale to ensure consistent English month abbreviations
  const month = dateObject.toLocaleString('en-US', { month: 'short' });
  const year = dateObject.getFullYear().toString().slice(-2); // Get the last two digits of the year

  return `${day} ${month} ${year}`;
}
