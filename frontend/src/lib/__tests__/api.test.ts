import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_FORBIDDEN_EVENT, apiClient } from '../api';

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiClient の認証エラー処理', () => {
  const mockFetch = vi.fn();
  const location = { href: '/merchants' };
  const onForbidden = vi.fn<() => void>();

  const refreshCalls = () => mockFetch.mock.calls.filter(([url]) => String(url) === '/api/auth/refresh');

  beforeEach(() => {
    mockFetch.mockReset();
    location.href = '/merchants';
    onForbidden.mockReset();

    const target = new EventTarget();
    target.addEventListener(API_FORBIDDEN_EVENT, onForbidden);
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('window', Object.assign(target, { location }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const run = async <T>(promise: Promise<T>) => {
    const settled = promise.catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    return settled;
  };

  it('403はリフレッシュも再送もせず、ログイン画面へ移動しない', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'この操作を行う権限がありません' }, 403));

    const error = await run(apiClient.deleteMerchant('m1')) as Error & { response?: { status: number } };

    expect(error.message).toBe('この操作を行う権限がありません');
    expect(error.response?.status).toBe(403);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(location.href).toBe('/merchants');
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });

  it('403で error.message の形でも本文のメッセージを使う', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: { code: 'FORBIDDEN', message: 'この管理者アカウントを扱う権限がありません' } }, 403));

    const error = await run(apiClient.deleteAdminAccount('a1')) as Error;

    expect(error.message).toBe('この管理者アカウントを扱う権限がありません');
    expect(location.href).toBe('/merchants');
  });

  it('401はリフレッシュして再送する', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 'm1' }, 200));

    const result = await run(apiClient.getMerchant('m1'));

    expect(result).toEqual({ id: 'm1' });
    expect(refreshCalls()).toHaveLength(1);
    expect(location.href).toBe('/merchants');
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('401でリフレッシュに失敗したらログイン画面へ移動する', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'No refresh token' }, 401));

    const error = await run(apiClient.getMerchant('m1')) as Error;

    expect(error.message).toBe('Unauthorized');
    expect(location.href).toBe('/login?session=expired');
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('リフレッシュ後の再送が403なら、ログイン画面へ移動しない', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({ message: 'この操作を行う権限がありません' }, 403));

    const error = await run(apiClient.deleteMerchant('m1')) as Error & { response?: { status: number } };

    expect(error.message).toBe('この操作を行う権限がありません');
    expect(error.response?.status).toBe(403);
    expect(location.href).toBe('/merchants');
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });

  it('skipAuthRedirect のリクエストは403でも通知しない', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'この事業者へのアクセス権限がありません' }, 403));

    await run(apiClient.getMe());

    expect(onForbidden).not.toHaveBeenCalled();
  });
});
