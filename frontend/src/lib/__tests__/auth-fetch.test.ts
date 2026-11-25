import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticatedFetch } from '../auth-fetch';
import { COOKIE_NAMES } from '../cookie-config';

const API_URL = 'http://localhost:3002/api/v1/admin/users/u1';

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createRequest = () =>
  new NextRequest('http://localhost:3000/api/admin/users/u1', {
    method: 'PUT',
    headers: { cookie: `${COOKIE_NAMES.ACCESS_TOKEN}=access; ${COOKIE_NAMES.REFRESH_TOKEN}=refresh` },
  });

const refreshCalls = (mockFetch: ReturnType<typeof vi.fn>) =>
  mockFetch.mock.calls.filter(([url]) => String(url).endsWith('/refresh'));

describe('authenticatedFetch', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('権限不足の403はリフレッシュせず、そのまま返す', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'この操作を行う権限がありません' }, 403));

    const { response, refreshed } = await authenticatedFetch(createRequest(), API_URL, { method: 'PUT' });

    expect(response.status).toBe(403);
    expect(refreshed).toBe(false);
    expect(await response.json()).toEqual({ message: 'この操作を行う権限がありません' });
    expect(refreshCalls(mockFetch)).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('無効なトークンの403は401と同じくリフレッシュして再送する', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: '無効なトークンです' }, 403))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 'u1' }, 200));

    const { response, refreshed } = await authenticatedFetch(createRequest(), API_URL, { method: 'PUT' });

    expect(response.status).toBe(200);
    expect(refreshed).toBe(true);
    expect(refreshCalls(mockFetch)).toHaveLength(1);
  });

  it('401はこれまでどおりリフレッシュして再送する', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'アクセストークンが必要です' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 'u1' }, 200));

    const { response, refreshed } = await authenticatedFetch(createRequest(), API_URL, { method: 'PUT' });

    expect(response.status).toBe(200);
    expect(refreshed).toBe(true);
  });

  it('リフレッシュ後の再送が403なら、そのまま403を返す', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: '無効なトークンです' }, 403))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ message: 'この操作を行う権限がありません' }, 403));

    const { response } = await authenticatedFetch(createRequest(), API_URL, { method: 'PUT' });

    expect(response.status).toBe(403);
  });
});
