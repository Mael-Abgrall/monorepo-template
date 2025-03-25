import type { Environment } from 'service-utils/environment';
import {
  createUser,
  createVerificationToken,
  deleteAndFlushVerificationTokens,
  getUser,
  getUserByEmail,
  getVerificationToken,
} from 'database/user';
import { sendEmail } from 'service-utils/emails';
import { setEnvironment } from 'service-utils/environment';
import { uuidV5 } from 'service-utils/uuid';
import { describe, expect, it, vi } from 'vitest';
import { finishOTP, getOTPUserByEmail, initOTP } from '../../core-auth';

vi.mock('database/user');
vi.mock('service-utils/emails');

setEnvironment({ env: process.env as unknown as Environment });
const testUser = {
  createdAt: new Date(),
  email: 'test@example.com',
  id: uuidV5({ name: 'test@example.com' }),
  lastActivity: new Date(),
  updatedAt: new Date(),
} satisfies Awaited<ReturnType<typeof getUserByEmail>>;

const oauthTestUser = {
  ...testUser,
  id: uuidV5({ name: '123456789' }),
} satisfies Awaited<ReturnType<typeof getUserByEmail>>;

describe('getOTPUserByEmail', () => {
  it('should return the user when exists with matching uuidV5', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(testUser);
    const result = await getOTPUserByEmail({ email: testUser.email });
    expect(result).toEqual(testUser);
  });

  it('should return undefined when user does not exist', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(undefined);
    const result = await getOTPUserByEmail({
      email: 'nonexistent@example.com',
    });
    expect(result).toBeUndefined();
  });

  it('should throw error when email exists but uuidV5 does not match', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(oauthTestUser);

    await expect(getOTPUserByEmail({ email: testUser.email })).rejects.toThrow(
      'Email already in use',
    );
  });
});

describe('initOTP', () => {
  it('should create verification token and send email', async () => {
    const testEmail = 'test@example.com';
    const testUserID = 'test-user-id';
    const testTokenID = 'test-token-id';

    vi.mocked(createVerificationToken).mockResolvedValue({
      createdAt: new Date(),
      email: testEmail,
      id: testTokenID,
      token: 'fakeToken',
      userID: testUserID,
    } satisfies Awaited<ReturnType<typeof createVerificationToken>>);
    vi.mocked(sendEmail).mockResolvedValue();

    const result = await initOTP({ email: testEmail, userID: testUserID });

    expect(typeof result).toBe('string');
    expect(createVerificationToken).toHaveBeenCalledWith({
      email: testEmail,
      token: expect.any(String),
      userID: testUserID,
    });
    // @ts-expect-error -- this is a spy from a mock
    const realToken = createVerificationToken.mock.calls[0][0].token;

    expect(sendEmail).toHaveBeenCalledWith({
      body: expect.stringContaining(realToken),
      subject: 'one time password',
      to: testEmail,
    });
  });

  it('should work without userID', async () => {
    const testEmail = 'test@example.com';
    const testTokenID = 'test-token-id';

    vi.mocked(createVerificationToken).mockResolvedValue({
      createdAt: new Date(),
      email: testEmail,
      id: testTokenID,
      token: 'fakeToken',
      userID: undefined,
    } satisfies Awaited<ReturnType<typeof createVerificationToken>>);
    vi.mocked(sendEmail).mockResolvedValue();

    const result = await initOTP({ email: testEmail, userID: undefined });

    expect(result).toBe(testTokenID);
  });
});

describe('finishOTP', () => {
  it('get a user, flush tokens; send an email and indicate user does not need onboarding', async () => {
    const testTokenRecord = {
      createdAt: new Date(),
      email: testUser.email,
      id: 'testTokenID',
      token: 'fakeToken',
      userID: testUser.id,
    } satisfies Awaited<ReturnType<typeof getVerificationToken>>;
    vi.mocked(getVerificationToken).mockResolvedValue(testTokenRecord);
    vi.mocked(getUser).mockResolvedValue(testUser);

    const result = await finishOTP({
      token: testTokenRecord.token,
      tokenID: testTokenRecord.id,
    });

    expect(result).toEqual({
      onboardUser: false,
      user: expect.objectContaining({
        email: testUser.email,
        id: testUser.id,
      }),
    });
    expect(deleteAndFlushVerificationTokens).toHaveBeenCalledWith({
      tokenID: testTokenRecord.id,
    });
    expect(sendEmail).toHaveBeenCalledWith({
      body: 'You have successfully logged in to your account.',
      subject: 'New Login to',
      to: testUser.email,
    });
  });

  it('create a new user when token has no userID (user from OTP), and indicate user needs onboarding', async () => {
    const testTokenRecordWithNoUserID = {
      createdAt: new Date(),
      email: testUser.email,
      id: 'testTokenID',
      token: 'fakeToken',
      userID: undefined,
    } satisfies Awaited<ReturnType<typeof getVerificationToken>>;
    vi.mocked(getVerificationToken).mockResolvedValue(
      testTokenRecordWithNoUserID,
    );
    vi.mocked(createUser).mockResolvedValue({
      ...testUser,
      id: crypto.randomUUID(),
    });

    const result = await finishOTP({
      token: testTokenRecordWithNoUserID.token,
      tokenID: testTokenRecordWithNoUserID.id,
    });

    expect(result).toEqual({
      onboardUser: true,
      user: expect.objectContaining({
        email: testUser.email,
        id: expect.any(String),
      }),
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('create a new user when token has a userID (user from OAuth), and indicate user needs onboarding', async () => {
    vi.mocked(getVerificationToken).mockResolvedValue({
      createdAt: new Date(),
      email: testUser.email,
      id: 'testTokenID',
      token: 'fakeToken',
      userID: testUser.id,
    });
    vi.mocked(getUser).mockResolvedValue(undefined);
    vi.mocked(createUser).mockResolvedValue(testUser);

    const result = await finishOTP({
      token: 'fakeToken',
      tokenID: 'testTokenID',
    });

    expect(result).toEqual({
      onboardUser: true,
      user: expect.objectContaining({
        email: testUser.email,
        id: testUser.id,
      }),
    });
    expect(getUser).toHaveBeenCalledWith({ userID: testUser.id });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('should throw error when token and tokenID do not match', async () => {
    const validTokenID = 'validTokenID';
    const invalidTokenID = 'invalidTokenID';
    const testToken = 'testToken';

    vi.mocked(getVerificationToken).mockResolvedValue({
      createdAt: new Date(),
      email: testUser.email,
      id: validTokenID,
      token: testToken,
      userID: testUser.id,
    } satisfies Awaited<ReturnType<typeof getVerificationToken>>);

    await expect(
      finishOTP({ token: testToken, tokenID: invalidTokenID }),
    ).rejects.toThrow('Invalid token');
  });

  it('should throw error when there is no OTP existing', async () => {
    vi.mocked(getVerificationToken).mockResolvedValue(
      undefined satisfies Awaited<ReturnType<typeof getVerificationToken>>,
    );

    await expect(
      finishOTP({ token: 'testToken', tokenID: 'testTokenID' }),
    ).rejects.toThrow('Invalid token');
  });
});
