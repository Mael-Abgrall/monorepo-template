/* v8 ignore start */
import { getContextLogger } from 'service-utils/logger';
import {
  decodeTokenGoogle,
  exchangeCodeGoogle,
  generateInitUrlGoogle,
} from './oauth-google.js';
import {
  decodeTokenMicrosoft,
  exchangeCodeMicrosoft,
  generateInitUrlMicrosoft,
} from './oauth-microsoft.js';

const logger = getContextLogger('oauth.ts');

/**
 * Exchange an OAuth code for an ID token
 * @param root named parameters
 * @param root.code OAuth code
 * @param root.vendor the vendor to use
 * @returns the ID token
 */
export async function exchangeCode({
  code,
  vendor,
}: {
  code: string;
  vendor: 'apple' | 'google' | 'microsoft';
}): Promise<{ email: string; userID: string }> {
  switch (vendor) {
    case 'apple': {
      logger.error('not implemented');
      throw new Error("no implementation for 'apple'");
    }
    case 'google': {
      const { id_token: idToken } = await exchangeCodeGoogle({ code });
      return decodeTokenGoogle({ idToken });
    }
    case 'microsoft': {
      const { id_token: idToken } = await exchangeCodeMicrosoft({ code });
      return decodeTokenMicrosoft({ idToken });
    }
    default: {
      logger.error('Invalid vendor');
      throw new Error('Invalid vendor');
    }
  }
}

/**
 * Generate an Url to init OAuth
 * @param root named parameters
 * @param root.state the state to attach
 * @param root.vendor the vendor to use
 * @returns the URL to redirect users to
 */
export async function generateInitUrl({
  state,
  vendor,
}: {
  state: string;
  vendor: 'apple' | 'google' | 'microsoft';
}): Promise<string> {
  switch (vendor) {
    case 'apple': {
      logger.error('not implemented');
      throw new Error("no implementation for 'apple'");
    }
    case 'google': {
      return generateInitUrlGoogle({ state });
    }
    case 'microsoft': {
      return generateInitUrlMicrosoft({ state });
    }
    default: {
      logger.error('Invalid vendor');
      throw new Error('Invalid vendor');
    }
  }
}
/* v8 ignore end */
