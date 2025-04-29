import type { Environment } from 'service-utils/environment';
import type {
  ListSpacesResponse,
  PostSpaceBody,
} from 'shared/schemas/shared-schemas-space';
import { createSpace, listSpaces } from 'core/space';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';
import { getSignedCookieCustom } from '../../../helpers/api-helpers-cookies';
import { verifyToken } from '../../../helpers/api-helpers-jwt';

vi.mock('core/space');
vi.mock('../../../helpers/api-helpers-cookies');
vi.mock('../../../helpers/api-helpers-jwt');

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /space', () => {
  it('is protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/space', {
      method: 'POST',
    });
    expect(response.status).toBe(401);
  });

  it('should create a new space', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const mockSpace = {
      createdAt: new Date(),
      spaceID: 'test-space-id',
      title: 'my title',
      userID: 'test-user-id',
      visibility: 'private',
    } satisfies Awaited<ReturnType<typeof createSpace>>;
    vi.mocked(createSpace).mockResolvedValue(
      mockSpace satisfies Awaited<ReturnType<typeof createSpace>>,
    );

    const response = await app.request('/space', {
      body: JSON.stringify({
        title: 'my title',
      } satisfies PostSpaceBody),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ...mockSpace,
      createdAt: mockSpace.createdAt.toISOString(),
    });
    expect(createSpace).toHaveBeenCalledWith({
      title: 'my title',
      userID: 'test-user-id',
    });
  });

  it('should create a new space named "untitled" when there is no title', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const mockSpace = {
      createdAt: new Date(),
      spaceID: 'test-space-id',
      title: 'untitled',
      userID: 'test-user-id',
      visibility: 'private',
    } satisfies Awaited<ReturnType<typeof createSpace>>;
    vi.mocked(createSpace).mockResolvedValue(
      mockSpace satisfies Awaited<ReturnType<typeof createSpace>>,
    );

    const response = await app.request('/space', {
      method: 'POST',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ...mockSpace,
      createdAt: mockSpace.createdAt.toISOString(),
    });
    expect(createSpace).toHaveBeenCalledWith({
      title: 'untitled',
      userID: 'test-user-id',
    });
  });
});

describe('GET /space/list', () => {
  it('is protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/space/list');
    expect(response.status).toBe(401);
  });

  it('should return a list of spaces', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const mockSpaces = [
      {
        createdAt: new Date(),
        spaceID: 'test-space-id',
        title: 'my title',
        userID: 'test-user-id',
        visibility: 'private',
      },
      {
        createdAt: new Date(),
        spaceID: 'test-space-id',
        title: 'my title',
        userID: 'test-user-id',
        visibility: 'private',
      },
    ] satisfies Awaited<ReturnType<typeof listSpaces>>;
    vi.mocked(listSpaces).mockResolvedValueOnce(
      mockSpaces satisfies Awaited<ReturnType<typeof listSpaces>>,
    );

    const response = await app.request('/space/list');
    expect(response.status).toBe(200);
    const body = (await response.json()) as ListSpacesResponse;
    expect(body[0]).toEqual({
      ...mockSpaces[0],
      createdAt: mockSpaces[0].createdAt.toISOString(),
    });
    expect(body[1]).toEqual({
      ...mockSpaces[1],
      createdAt: mockSpaces[1].createdAt.toISOString(),
    });
  });
});
