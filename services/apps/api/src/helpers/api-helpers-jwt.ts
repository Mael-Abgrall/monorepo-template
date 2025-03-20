import { environment } from 'service-utils/environment';
import { createSigner, createVerifier } from 'service-utils/jwt';

export interface AccessToken {
  userID: string;
}
export interface RefreshToken {
  userID: string;
}

const verify = createVerifier({
  cache: true,
  key: async () => {
    return environment.JWT_SECRET;
  },
});
const signAccess = createSigner({
  // algorithm: "EdDSA",
  expiresIn: '10h',
  key: async () => {
    return environment.JWT_SECRET;
  },
});
const signRefresh = createSigner({
  // algorithm: "EdDSA",
  expiresIn: '2w',
  key: async () => {
    return environment.JWT_SECRET;
  },
});

/**
 * Create a set of access and refresh token for an user
 * @param root named params
 * @param root.userID the user id
 * @returns an object {accessToken, refreshToken}
 */
export async function createTokens({ userID }: { userID: string }): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = await signAccess({
    userID,
  } satisfies AccessToken);

  const refreshToken = await signRefresh({
    userID,
  } satisfies RefreshToken);

  return { accessToken, refreshToken };
}

/**
 * Decode and validate a token.
 * @param root named params
 * @param root.token the token to verify and decode
 * @returns an access token or a refresh token, or undefined in case of an issue
 */
export async function verifyToken<T extends AccessToken | RefreshToken>({
  token,
}: {
  token: null | string;
}): Promise<T | undefined> {
  if (token) {
    try {
      const result = (await verify(token)) as T;
      return result;
    } catch {
      return undefined;
    }
  }
}
