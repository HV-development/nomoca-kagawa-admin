import { test, expect } from '@playwright/test';

/**
 * キャッシュ無効化ヘッダーのE2Eテスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * 
 * 全てのページで以下のヘッダーが設定されていることを確認：
 * - Cache-Control: no-store（必須）
 * - must-revalidate（推奨）
 */
test.describe('キャッシュ無効化ヘッダーの検証', () => {
  /**
   * Cache-Controlヘッダーを検証する
   */
  function validateCacheHeaders(cacheControl: string | undefined, path: string) {
    // Cache-Controlが設定されていることを確認
    expect(cacheControl, `${path}のCache-Controlヘッダーが設定されていません`).toBeTruthy();

    // no-storeが含まれていることを確認（キャッシュ無効化のために必須）
    expect(cacheControl, `${path}のCache-Controlヘッダーにno-storeが含まれていません。実際の値: ${cacheControl}`).toContain('no-store');
  }

  test('ログインページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/login');
  });

  test('トップページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/');
  });

  test('マーチャント一覧ページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/merchants', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/merchants');
  });

  test('店舗一覧ページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/shops', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/shops');
  });

  test('ユーザー一覧ページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/users', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/users');
  });

  test('クーポン一覧ページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/coupons', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/coupons');
  });

  test('管理者一覧ページでCache-Controlヘッダーが正しく設定されている', async ({ page }) => {
    const response = await page.goto('/admins', { waitUntil: 'load' });
    expect(response).toBeTruthy();

    const cacheControl = response?.headers()['cache-control'];
    validateCacheHeaders(cacheControl, '/admins');
  });
});
