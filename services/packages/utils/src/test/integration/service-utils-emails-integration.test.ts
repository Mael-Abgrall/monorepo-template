import { beforeAll, describe, expect, it } from 'vitest';
import type { Environment } from '../../environment';
import { setEnvironment } from '../../environment';
import { sendEmail } from '../../services-utils-emails';

beforeAll(() => {
  setEnvironment({ env: process.env as unknown as Environment });
});

describe('sendEmail', () => {
  it('sendEmail', async () => {
    await sendEmail({
      body: 'Test',
      subject: 'Test',
      to: 'test@blackhole.postmarkapp.com',
    });
    expect(true).toBe(true);
  });

  it('bounce', async () => {
    await sendEmail({
      body: 'Test',
      subject: 'Test',
      to: 'blocked@bounce-testing.postmarkapp.com',
    });
    expect(true).toBe(true);
  });
});
