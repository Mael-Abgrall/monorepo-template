import { ENVIRONMENT, getFrontendUrl } from 'service-utils/environment';
import { ofetch } from 'shared/fetch';
import { decoder } from './oauth-jwt.js';

/**
 * https://developers.google.com/identity/protocols/oauth2/web-server#httprest_3
 */
export interface OAuthCodeResponse {
  /**
   * This data is not mentioned in the documentation, but present when the scopes for OpenID are present
   */
  id_token: string;
}

/**
 * Decode a Google id token
 * @param root named parameters
 * @param root.idToken the id token to decode
 * @returns the email and userID
 * @throws Error if there is an issue with the token or the data within it
 */
export async function decodeTokenGoogle({
  idToken,
}: {
  idToken: string;
}): Promise<{ email: string; userID: string }> {
  const decoded = decoder(idToken) as {
    at_hash?: string;
    aud?: string;
    azp?: string;
    email?: string;
    email_verified?: boolean;
    exp?: number;
    hd?: string;
    iat?: number;
    iss?: string;
    sub?: string;
  };
  if (!decoded.email) {
    throw new Error('No email in Google id token');
  }
  if (!decoded.sub) {
    throw new Error('No sub in Google id token');
  }
  return {
    email: decoded.email,
    userID: decoded.sub,
  };
}

/**
 * Exchange an OAuth code with Google for a set of tokens
 * @param root named parameters
 * @param root.code OAuth code
 * @returns the code response
 * @throws Error if there is an issue
 */
export async function exchangeCodeGoogle({
  code,
}: {
  code: string;
}): Promise<OAuthCodeResponse> {
  try {
    const response = await ofetch<OAuthCodeResponse>(
      'https://oauth2.googleapis.com/token',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        params: {
          client_id: ENVIRONMENT.GOOGLE_APP_ID,
          client_secret: ENVIRONMENT.GOOGLE_APP_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${getFrontendUrl()}/auth/callback/google`,
        },
      },
    );

    return response;
  } catch (error) {
    const message = 'Error while exchanging OAuth code with Google';
    console.error(error);
    // await errorReport({ error, message });
    throw new Error(message);
  }
}

/**
 * Generate the initial URL for Google OAuth
 * @param root named parameters
 * @param root.state the state to attach
 * @returns the initial URL
 */
export async function generateInitUrlGoogle({
  state,
}: {
  state: string;
}): Promise<string> {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.append('client_id', ENVIRONMENT.GOOGLE_APP_ID);
  url.searchParams.append(
    'redirect_uri',
    `${getFrontendUrl()}/auth/callback/google`,
  );
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'email openid');
  // url.searchParams.append('access_type', 'offline'); // Required when requesting a refresh token
  // url.searchParams.append('include_granted_scopes', 'true'); // Required when requesting a refresh token
  url.searchParams.append('state', state);
  return url.toString();
}
