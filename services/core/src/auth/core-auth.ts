import type { User } from 'database/user';
import {
  createUser,
  createVerificationToken,
  deleteAndFlushVerificationTokens,
  getUser,
  getUserByEmail,
  getVerificationToken,
} from 'database/user';
import crypto from 'node:crypto';
import { uuidV5 } from 'service-utils/uuid';
import { sendEmail } from '../../../packages/utils/src/service-utils-emails';

export { asActiveTokens } from 'database/user';
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
      id: uuidV5({ name: verificationToken.email }),
    },
  });
  return { onboardUser: true, user: createdUserFromEmail };
}

/**
 * Get a user by email, and verify this user logged in with OTP.
 *
 * This function is important, as a user that signed up with OAuth will be rejected when using OTP with the same email.
 * @param root Named parameters
 * @param root.email The email of the user to get.
 * @throws If the email is already in use, but not created with OTP.
 * @returns The user, or undefined if the user does not exist.
 */
export async function getOTPUserByEmail({
  email,
}: {
  email: string;
}): Promise<undefined | User> {
  const user = await getUserByEmail({ email });
  const uuid = uuidV5({ name: email });
  if (!user) {
    return undefined;
  }
  if (user.id === uuid) {
    return user;
  }
  throw new Error('Email already in use');
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
