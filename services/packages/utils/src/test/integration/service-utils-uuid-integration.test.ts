import { beforeAll, describe, expect, it } from 'vitest';
import type { Environment } from '../../environment';
import { setEnvironment } from '../../environment';
import { uuidV5 } from '../../service-utils-uuid';

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

describe('generateUUIDv5', () => {
  it('should generate consistent UUIDs for the same name and namespace', () => {
    const name = 'test-value';

    const uuid1 = uuidV5({ name });
    const uuid2 = uuidV5({ name });

    expect(uuid1).toBe(uuid2);
  });

  it('should generate different UUIDs for different names', () => {
    const uuid1 = uuidV5({ name: 'name1' });
    const uuid2 = uuidV5({ name: 'name2' });

    expect(uuid1).not.toBe(uuid2);
  });
});
