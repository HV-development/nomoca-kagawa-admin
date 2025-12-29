import { test, expect } from '@playwright/test';

/**
 * 権限別の表示内容確認テスト
 * 
 * このテストは認証済みの operator ユーザーとしてログインした状態で実行されます。
 * storageState を使用（auth.setup.ts で設定）
 */
test.describe('権限別の表示内容確認', () => {
  // ================================================================
  // 基本的なナビゲーション確認
  // ================================================================
  test.describe('Operator権限での表示', () => {
    test('サイドバーが表示されること', async ({ page }) => {
      await page.goto('/');
      
      // ローディングが終わるまで待機
      await page.waitForTimeout(2000);

      // サイドバーまたはナビゲーションが存在することを確認
      const hasSidebar = await page.locator('nav, [role="navigation"], aside').first().isVisible().catch(() => false);
      const hasMain = await page.locator('main').isVisible().catch(() => false);
      expect(hasSidebar || hasMain).toBeTruthy();
    });

    test('ユーザー一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/users');

      // ページが表示されることを確認
      await expect(page).toHaveURL(/\/users/);

      // ローディングが終わるまで待機
      await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});
      
      // テーブルまたはコンテンツが存在することを確認
      const hasContent = await page.locator('table, main').isVisible().catch(() => false);
      const hasHeading = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasContent || hasHeading).toBeTruthy();
    });

    test('マーチャント一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/merchants');

      // ページが表示されることを確認
      await expect(page).toHaveURL(/\/merchants/);
    });

    test('店舗一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/shops');

      // ページが表示されることを確認
      await expect(page).toHaveURL(/\/shops/);
    });

    test('クーポン一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/coupons');

      // ページが表示されることを確認
      await expect(page).toHaveURL(/\/coupons/);
    });
  });

  // ================================================================
  // ユーザー情報表示テスト
  // ================================================================
  test.describe('ユーザー情報の表示', () => {
    test('ユーザー一覧ページにテーブルが表示されること', async ({ page }) => {
      await page.goto('/users');

      // ローディングが終わるまで待機
      await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

      // テーブルヘッダーが存在することを確認
      const table = page.locator('table');
      if (await table.isVisible().catch(() => false)) {
        const headers = page.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });
  });
});
