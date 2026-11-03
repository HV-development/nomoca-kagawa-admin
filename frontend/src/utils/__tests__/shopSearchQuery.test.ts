import { describe, it, expect } from 'vitest';
import { appendShopAddressParam, appendShopDateRangeParams } from '../shopSearchQuery';

const emptyRange = { createdAtFrom: '', createdAtTo: '', updatedAtFrom: '', updatedAtTo: '' };

describe('appendShopDateRangeParams', () => {
  it('登録日・更新日の範囲を、店舗一覧 API が読むクエリ名で加える', () => {
    const queryParams = new URLSearchParams({ page: '1', limit: '10' });
    appendShopDateRangeParams(queryParams, {
      createdAtFrom: '2026-10-01',
      createdAtTo: '2026-10-31',
      updatedAtFrom: '2026-11-01',
      updatedAtTo: '2026-11-03',
    });

    expect(queryParams.toString()).toBe(
      'page=1&limit=10&createdFrom=2026-10-01&createdTo=2026-10-31&updatedFrom=2026-11-01&updatedTo=2026-11-03'
    );
    expect(queryParams.has('createdAtFrom')).toBe(false);
    expect(queryParams.has('updatedAtTo')).toBe(false);
  });

  it('未入力の日付は加えない', () => {
    const queryParams = new URLSearchParams();
    appendShopDateRangeParams(queryParams, { ...emptyRange, createdAtTo: '2026-10-31' });

    expect(queryParams.toString()).toBe('createdTo=2026-10-31');
  });

  it('すべて未入力なら何も加えない', () => {
    const queryParams = new URLSearchParams();
    appendShopDateRangeParams(queryParams, emptyRange);

    expect(queryParams.toString()).toBe('');
  });
});

describe('appendShopAddressParam', () => {
  it('住所を、店舗一覧 API が読む fulladdress で加える', () => {
    const queryParams = new URLSearchParams({ page: '1', limit: '10' });
    appendShopAddressParam(queryParams, { address: '丸亀市' });

    expect(queryParams.toString()).toBe(`page=1&limit=10&fulladdress=${encodeURIComponent('丸亀市')}`);
    expect(queryParams.has('address')).toBe(false);
  });

  it('未入力なら何も加えない', () => {
    const queryParams = new URLSearchParams();
    appendShopAddressParam(queryParams, { address: '' });

    expect(queryParams.toString()).toBe('');
  });
});
