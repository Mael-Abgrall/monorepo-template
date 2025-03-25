/**
 * Why does this file only exports the library (plus a single helper):
 *
 * - Signing and verifying JWT tokens should only be done by the api server, and no other microservices
 * - We still require the helper when we need to decode (but not verify) a token
 *
 * This reduces the number of secrets to use
 */
import { createDecoder } from 'fast-jwt';

export { createSigner, createVerifier } from 'fast-jwt';

const decode = createDecoder();

/**
 * Decode a token.
 * @param root named params
 * @param root.token the token to decode
 * @returns the token payload
 */
export async function decodeToken<T>({ token }: { token: string }): Promise<T> {
  return decode(token) as T;
}
