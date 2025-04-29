/* eslint-disable no-console -- This is a basic logger for now */
export const logger = {
  error: (message: unknown): void => {
    console.error(message);
  },
  info: (message: string): void => {
    console.info(message);
  },
  warn: (message: string): void => {
    console.warn(message);
  },
};
/* eslint-enable no-console -- This is a basic logger for now */
