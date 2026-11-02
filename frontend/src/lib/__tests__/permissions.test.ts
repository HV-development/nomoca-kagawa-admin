import { describe, it, expect } from 'vitest';
import { getDeniedRedirect, getPermissions, isRestrictedPath } from '../permissions';

const sysadmin = { accountType: 'admin', role: 'sysadmin' };
const operator = { accountType: 'admin', role: 'operator' };
const viewer = { accountType: 'admin', role: 'viewer' };
const merchant = { accountType: 'merchant' };
const shop = { accountType: 'shop' };

describe('getPermissions', () => {
  it.each([
    ['sysadmin', sysadmin, { canManageAdmins: true, canWrite: true, canCreateShop: true }],
    ['operator', operator, { canManageAdmins: false, canWrite: true, canCreateShop: true }],
    ['viewer', viewer, { canManageAdmins: false, canWrite: false, canCreateShop: false }],
    ['事業者', merchant, { canManageAdmins: false, canWrite: true, canCreateShop: true }],
    ['店舗', shop, { canManageAdmins: false, canWrite: true, canCreateShop: false }],
  ])('%s の権限', (_name, user, expected) => {
    expect(getPermissions(user)).toEqual(expected);
  });

  it('役割が分からない管理者は変更できない', () => {
    expect(getPermissions({ accountType: 'admin' }).canWrite).toBe(false);
  });

  it('未ログインはすべて不可', () => {
    expect(getPermissions(null)).toEqual({ canManageAdmins: false, canWrite: false, canCreateShop: false });
  });
});

describe('getDeniedRedirect', () => {
  const redirect = (pathname: string, user: Parameters<typeof getPermissions>[0]) =>
    getDeniedRedirect(pathname, getPermissions(user));

  it('sysadmin 以外は管理者の新規登録を開けない', () => {
    expect(redirect('/admins/new', sysadmin)).toBeNull();
    expect(redirect('/admins/new', operator)).toBe('/admins');
    expect(redirect('/admins/new', viewer)).toBe('/admins');
  });

  it.each([
    ['/merchants/new', '/merchants'],
    ['/merchants/confirm', '/merchants'],
    ['/merchants/m1/edit', '/merchants'],
    ['/merchants/m1/confirm', '/merchants'],
    ['/merchants/m1/shops/new', '/merchants'],
    ['/merchants/m1/shops/s1/edit', '/merchants'],
    ['/shops/new', '/shops'],
    ['/shops/confirm', '/shops'],
    ['/shops/s1/edit', '/shops'],
    ['/shops/s1/confirm', '/shops'],
    ['/coupons/new', '/coupons'],
    ['/coupons/confirm', '/coupons'],
    ['/coupons/c1/edit', '/coupons'],
    ['/coupons/c1/confirm', '/coupons'],
    ['/users/u1/edit', '/users'],
    ['/users/u1/confirm', '/users'],
    ['/campaigns/new', '/campaigns'],
    ['/campaigns/confirm', '/campaigns'],
    ['/campaigns/c1/edit', '/campaigns'],
    ['/campaigns/c1/confirm', '/campaigns'],
  ])('viewer は %s を開けず %s に戻る', (pathname, expected) => {
    expect(redirect(pathname, viewer)).toBe(expected);
    expect(redirect(pathname, operator)).toBeNull();
    expect(isRestrictedPath(pathname)).toBe(true);
  });

  it.each([
    '/merchants',
    '/merchants/m1/shops',
    '/shops',
    '/shops/s1',
    '/shops/s1/coupons',
    '/shops/s1/referral-users',
    '/coupons',
    '/coupons/c1/history',
    '/users',
    '/users/u1',
    '/users/u1/coupon-history',
    '/campaigns',
    '/coupon-history',
    '/admins',
    '/admins/a1/edit',
  ])('viewer も閲覧画面 %s は開ける', (pathname) => {
    expect(redirect(pathname, viewer)).toBeNull();
  });

  it.each(['/shops/new', '/shops/confirm', '/merchants/m1/shops/new'])(
    '店舗アカウントは店舗の新規作成 %s を開けない',
    (pathname) => {
      expect(redirect(pathname, shop)).toBe('/shops');
      expect(redirect(pathname, merchant)).toBeNull();
    }
  );

  it('店舗アカウントは自分の店舗の編集やクーポン作成を開ける', () => {
    expect(redirect('/shops/s1/edit', shop)).toBeNull();
    expect(redirect('/merchants/m1/shops/s1/edit', shop)).toBeNull();
    expect(redirect('/coupons/new', shop)).toBeNull();
  });
});
