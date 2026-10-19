import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api';

vi.mock('../client-header-utils', () => ({ buildClientHeaders: () => ({}) }));

afterEach(() => vi.unstubAllGlobals());

function mockCounts(counts: unknown[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ month: '2026-10', counts }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })));
}

describe('getShopReferralCounts', () => {
  it('登録月を絞らない登録人数を返す', async () => {
    mockCounts([{ shopId: 's1', cumulativeReferralCount: 12, qrCodeUrl: '' }]);
    const result = await apiClient.getShopReferralCounts(['s1']);
    expect(result.counts[0].cumulativeReferralCount).toBe(12);
  });

  it('登録人数0人は正常な値として扱う', async () => {
    mockCounts([{ shopId: 's1', cumulativeReferralCount: 0, qrCodeUrl: '' }]);
    expect((await apiClient.getShopReferralCounts(['s1'])).counts[0].cumulativeReferralCount).toBe(0);
  });

  it.each([undefined, null, -1, 1.5, '12'])('登録人数が不正（%s）なら0で代用せずエラーにする', async (value) => {
    mockCounts([{ shopId: 's1', cumulativeReferralCount: value, qrCodeUrl: '' }]);
    await expect(apiClient.getShopReferralCounts(['s1'])).rejects.toThrow('登録ユーザー数を取得できませんでした');
  });
});
