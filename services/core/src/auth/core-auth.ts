import type { User } from 'database/user';
import {
  createUser,
  createVerificationToken,
  deleteAndFlushVerificationTokens,
  getUser,
  getVerificationToken,
} from 'database/user';
import crypto from 'node:crypto';
import { sendEmail } from '../../../packages/utils/src/services-utils-emails';

export { getUserByEmail } from 'database/user';
export { exchangeCode, generateInitUrl as initOAuth } from 'oauth';

/**
 * Finish the OTP flow.
 * @param root Named parameters
 * @param root.token The OTP token to finish.
 * @param root.tokenID The ID of the token, to verify the user is the one that requested the OTP.
 * @returns The user, or undefined if the token is invalid.
 */
export async function finishOTP({
  token,
  tokenID,
}: {
  token: string;
  tokenID: string;
}): Promise<undefined | User> {
  const verificationToken = await getVerificationToken({ token });
  if (!verificationToken || verificationToken.id !== tokenID) {
    return undefined;
  }

  await deleteAndFlushVerificationTokens({ tokenID: verificationToken.id });

  if (verificationToken.userID) {
    const user = await getUser({ userID: verificationToken.userID });
    if (user) {
      await sendEmail({
        body: 'You have successfully logged in to your account.',
        subject: 'New Login to Ansearch',
        to: user.email,
      });
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

/**
 * Initialize the OTP flow.
 * @param root Named parameters
 * @param root.email The email of the user to send the OTP to.
 * @param root.userID The ID of the user to send the OTP to.
 * @returns The token ID of the verification token that was created.
 */
export async function initOTP({
  email,
  userID,
}: {
  email: string;
  userID: string | undefined;
}): Promise<string> {
  const token0 = crypto.randomInt(100, 999);
  const token1 = crypto.randomInt(100, 999);
  const token = `${token0}-${token1}`;

  const verificationToken = await createVerificationToken({
    email,
    expiresAt: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes
    token,
    userID,
  });

  await sendEmail({
    body: `Your one time password is ${token} it will expire in 5 minutes.`,
    subject: 'Ansearch one time password',
    to: email,
  });

  return verificationToken.id;
}
