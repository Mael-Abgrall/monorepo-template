import type { User } from 'database/user';
import {
  createUser,
  createVerificationToken,
  deleteAndFlushVerificationTokens,
  getUser,
  getVerificationToken,
} from 'database/user';
import crypto from 'node:crypto';
import { sendEmail } from '../../../packages/utils/src/service-utils-emails';

export { asActiveTokens, getUserByEmail } from 'database/user';
export { exchangeCode, generateInitUrl as initOAuth } from 'oauth';
/**
 * Finish the OTP flow.
 * @param root Named parameters
 * @param root.token The OTP token to finish.
 * @param root.tokenID The ID of the token, to verify the user is the one that requested the OTP.
 * @throws If the token is invalid.
 * @returns The user, and if the user needs to be onboarded.
 */
export async function finishOTP({
  token,
  tokenID,
}: {
  token: string;
  tokenID: string;
}): Promise<{ onboardUser: boolean; user: User }> {
  const verificationToken = await getVerificationToken({ token });
  if (!verificationToken || verificationToken.id !== tokenID) {
    throw new Error('Invalid token');
  }

  await deleteAndFlushVerificationTokens({ tokenID: verificationToken.id });

  if (verificationToken.userID) {
    const user = await getUser({ userID: verificationToken.userID });
    if (user) {
      await sendEmail({
        body: 'You have successfully logged in to your account.',
        subject: 'New Login to',
        to: user.email,
      });
      return { onboardUser: false, user };
    }
    const createdUserFromOAuth = await createUser({
      user: {
        email: verificationToken.email,
        id: verificationToken.userID,
      },
    });
    return { onboardUser: true, user: createdUserFromOAuth };
  }

  const createdUserFromEmail = await createUser({
    user: {
      email: verificationToken.email,
      id: crypto.randomUUID(),
    },
  });
  return { onboardUser: true, user: createdUserFromEmail };
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
    token,
    userID,
  });

  await sendEmail({
    body: `Your one time password is ${token} it will expire in 5 minutes.`,
    subject: 'one time password',
    to: email,
  });

  return verificationToken.id;
}
