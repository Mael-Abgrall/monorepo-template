import { ENVIRONMENT, getFrontendUrl } from 'service-utils/environment';
import { ofetch } from 'shared/fetch';
import { decoder } from './oauth-jwt.js';

/**
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code#successful-authentication-response
 */
export interface OAuthCodeResponse {
  id_token: string;
}

/**
 * Decode a Microsoft id token
 *
 * Doc: https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference#payload-claims
 * @param root named parameters
 * @param root.idToken the id token to decode
 * @returns the email and userID
 * @throws Error if there is an issue with the token or the data within it
 */
export async function decodeTokenMicrosoft({
  idToken,
}: {
  idToken: string;
}): Promise<{ email: string; userID: string }> {
  const decoded = decoder(idToken) as {
    aio?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    iss?: string;
    name?: string;
    nbf?: number;
    oid?: string;
    preferred_username?: string;
    rh?: string;
    sub?: string;
    tid?: string;
    uti?: string;
    ver?: '2.0';
  };
  if (!decoded.preferred_username) {
    throw new Error('No preferred_username in Microsoft id token');
  }
  if (!decoded.oid) {
    throw new Error('No oid in Microsoft id token');
  }
  return {
    email: decoded.preferred_username,
    userID: decoded.oid,
  };
}

/**
 * Exchange an OAuth code with Microsoft for a set of tokens
 *
 * Doc: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-access-token-with-a-client_secret
 * @param root named parameters
 * @param root.code OAuth code
 * @returns the code response
 * @throws Error if there is an issue
 */
export async function exchangeCodeMicrosoft({
  code,
}: {
  code: string;
}): Promise<OAuthCodeResponse> {
  try {
    const response = await ofetch<OAuthCodeResponse>(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        params: {
          client_id: ENVIRONMENT.MICROSOFT_CLIENT_ID,
          client_secret: ENVIRONMENT.MICROSOFT_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${getFrontendUrl()}/auth/callback/microsoft`,
        },
      },
    );

    return response;
  } catch (error) {
    const message = 'Error while exchanging OAuth code with Microsoft';
    console.error(error);
    // await errorReport({ error, message });
    throw new Error(message);
  }
}

/**
 * Generate the initial URL for Microsoft OAuth
 *
 * Doc: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#request-an-authorization-code
 * @param root named parameters
 * @param root.state the state to attach
 * @returns the initial URL
 */
export async function generateInitUrlMicrosoft({
  state,
}: {
  state: string;
}): Promise<string> {
  const url = new URL(
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  );
  url.searchParams.append('client_id', ENVIRONMENT.MICROSOFT_CLIENT_ID);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append(
    'redirect_uri',
    getFrontendUrl() + '/auth/callback/microsoft',
  );
  url.searchParams.append('response_mode', 'query');
  url.searchParams.append('scope', 'profile openid email');
  url.searchParams.append('state', state);
  url.searchParams.append('prompt', 'select_account');
  return url.toString();
}
