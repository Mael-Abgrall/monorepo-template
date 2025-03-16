import type { User } from 'database/user';
import {
  createUser,
  createVerificationToken,
  deleteAndFlushVerificationTokens,
  getUser,
  getVerificationToken,
} from 'database/user';
import crypto from 'node:crypto';

export { getUserByEmail } from 'database/user';
export { exchangeCode, generateInitUrl as initOAuth } from 'oauth';

/**
 * Finish the OTP flow.
 * @param root Named parameters
 * @param root.token The OTP token to finish.
 * @returns The user, or undefined if the token is invalid.
 */
export async function finishOTP({
  token,
}: {
  token: string;
}): Promise<undefined | User> {
  const verificationToken = await getVerificationToken({ token });
  if (!verificationToken) {
    return undefined;
  }
  await deleteAndFlushVerificationTokens({ tokenID: verificationToken.id });

  if (verificationToken.userID) {
    const user = await getUser({ userID: verificationToken.userID });
    if (user) {
      // todo: send email notification
      return user;
    }
    const createdUserFromOAuth = await createUser({
      user: {
        email: verificationToken.email,
        id: verificationToken.userID,
        userName: verificationToken.email,
      },
    });
    return createdUserFromOAuth;
  }

  const createdUserFromEmail = await createUser({
    user: {
      email: verificationToken.email,
      id: crypto.randomUUID(),
      userName: verificationToken.email,
    },
  });
  return createdUserFromEmail;
}

/*

Init OAuth
- fetch provider config

Finish OAuth
- fetch user
  If user:
    - create cookie
    - send email notification
  Else:
    - OTP init flow

*/

/**
 * Initialize the OTP flow.
 * @param root Named parameters
 * @param root.email The email of the user to send the OTP to.
 * @param root.userID The ID of the user to send the OTP to.
 */
export async function initOTP({
  email,
  userID,
}: {
  email: string;
  userID: string | undefined;
}): Promise<void> {
  const token0 = crypto.randomInt(100, 999);
  const token1 = crypto.randomInt(100, 999);
  const token = `${token0}-${token1}`;

  const verificationToken = await createVerificationToken({
    email,
    expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes
    token,
    userID,
  });

  // todo: send email with the OTP
}
