import { describe, it, expect } from 'vitest';
import { toSafeBackHref } from '../safeReturnTo';

describe('toSafeBackHref', () => {
  it('同一サイト内のパスはそのまま戻り先にする', () => {
    expect(toSafeBackHref(encodeURIComponent('/shops?page=2&name=a'))).toBe('/shops?page=2&name=a');
  });

  it.each([
    ['未指定', null],
    ['空文字', ''],
    ['外部URL', encodeURIComponent('https://evil.example')],
    ['// で始まる', encodeURIComponent('//evil.example')],
    ['/\\ で始まる', '%2F%5Cevil.example'],
    ['タブを挟む', encodeURIComponent('/\t/evil.example')],
    ['壊れたエンコード', '%E0'],
  ])('%s は /shops に戻す', (_, raw) => {
    expect(toSafeBackHref(raw)).toBe('/shops');
  });
});
