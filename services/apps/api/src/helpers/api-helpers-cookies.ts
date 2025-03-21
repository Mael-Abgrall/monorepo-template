import type { Context } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import { environment } from 'service-utils/environment';

/**
 * Get a signed cookie using best practices
 * @param root named params
 * @param root.context the context
 * @param root.name the name of the cookie
 * @returns the value of the cookie or undefined if the cookie is not set / invalid
 */
export async function getSignedCookieCustom({
  context,
  name,
}: {
  context: Context;
  name: string;
}): Promise<string | undefined> {
  const cookie = await getSignedCookie(
    context,
    environment.COOKIE_SECRET,
    name,
  );
  if (cookie === false) {
    return undefined;
  }
  return cookie;
}

/**
 * Set a signed cookie using best practices
 * @param root named params
 * @param root.context the context
 * @param root.maxAge the max age of the cookie (default 10 minutes)
 * @param root.name the name of the cookie
 * @param root.value the value of the cookie
 */
export async function setSignedCookieCustom({
  context,
  maxAge,
  name,
  value,
}: {
  context: Context;
  maxAge?: number;
  name: string;
  value: string;
}): Promise<void> {
  await setSignedCookie(context, name, value, environment.COOKIE_SECRET, {
    domain: environment.DOMAIN,
    httpOnly: true,
    maxAge: maxAge ?? 600, // 10 minutes
    path: '/',
    sameSite: 'Strict',
    secure: true,
  });
}
