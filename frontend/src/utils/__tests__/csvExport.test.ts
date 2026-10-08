import { describe, it, expect } from 'vitest';
import { convertReferralUsersToCSV, convertShopsToCSV, formatReferralMonthLabel, type ShopForCSV } from '../csvExport';

const shop: ShopForCSV = {
  merchantName: '事業者A',
  name: '店舗A',
  nameKana: 'テンポエー',
  postalCode: '3300061',
  address: 'さいたま市',
  accountEmail: 'shop@example.com',
  phone: '0480000000',
  status: 'operating',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  monthlyReferralCount: 3,
  qrCodeUrl: 'https://example.jp/email-registration?shop_id=s1',
};

function rows(csv: string): string[][] {
  return csv.replace(/^﻿/, '').split('\n').map((line) => line.split(','));
}

describe('convertShopsToCSV', () => {
  it('年月を渡すと、電話番号の後ろに登録ユーザー数、最終列に店舗QRコードURLを出す', () => {
    const [header, row] = rows(convertShopsToCSV([shop], true, '2026年10月'));
    expect(header).toEqual([
      '事業者名', '店舗名', '店舗名（カナ）', '郵便番号', '住所', 'メールアドレス', '電話番号',
      '2026年10月登録ユーザー数', '承認ステータス', '登録日時', '更新日時', '店舗QRコードURL',
    ]);
    expect(row[header.indexOf('電話番号')]).toBe('0480000000');
    expect(row[header.indexOf('2026年10月登録ユーザー数')]).toBe('3');
    expect(row[header.indexOf('店舗QRコードURL')]).toBe('https://example.jp/email-registration?shop_id=s1');
    expect(row).toHaveLength(header.length);
  });

  it('年月を渡さなければ登録ユーザー数・QRコードURLの列を出さない（事業者管理配下の店舗一覧）', () => {
    const [header, row] = rows(convertShopsToCSV([shop], false));
    expect(header).not.toContain('店舗QRコードURL');
    expect(header.some((h) => h.endsWith('登録ユーザー数'))).toBe(false);
    expect(row).toHaveLength(header.length);
  });

  it('人数が 0 のときは 0 を出す', () => {
    const [header, row] = rows(convertShopsToCSV([{ ...shop, monthlyReferralCount: 0 }], false, '2026年10月'));
    expect(row[header.indexOf('2026年10月登録ユーザー数')]).toBe('0');
  });
});

describe('convertReferralUsersToCSV', () => {
  it('店舗名・顧客ID・登録日（YYYY/MM/DD）・登録プランを出す', () => {
    const csv = convertReferralUsersToCSV('店舗A', [
      { customerId: 'cust-1', registeredAt: '2026-10-01', planName: '月額プラン' },
      { customerId: '', registeredAt: '2026-09-16', planName: '' },
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(rows(csv)).toEqual([
      ['店舗名', '顧客ID', '登録日', '登録プラン'],
      ['店舗A', 'cust-1', '2026/10/01', '月額プラン'],
      ['店舗A', '', '2026/09/16', ''],
    ]);
  });
});

describe('formatReferralMonthLabel', () => {
  it('YYYY-MM を「YYYY年M月」にする', () => {
    expect(formatReferralMonthLabel('2026-10')).toBe('2026年10月');
    expect(formatReferralMonthLabel('2026-01')).toBe('2026年1月');
  });
});
