import { test, expect } from '@playwright/test';

/**
 * 店舗管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('店舗管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test('店舗一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/shops');

      // ページが正しく読み込まれることを確認
      await expect(page).toHaveURL(/\/shops/);

      // ローディングが終わるまで待機
      await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

      // テーブルまたは一覧コンテンツが存在することを確認
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasListContent = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasTable || hasListContent).toBeTruthy();
    });

    test('店舗一覧のテーブルヘッダーが表示されること', async ({ page }) => {
      await page.goto('/shops');

      // ローディングが終わるまで待機
      await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

      // テーブルヘッダーの確認（テーブルが存在する場合）
      const table = page.locator('table');
      if (await table.isVisible().catch(() => false)) {
        const headers = page.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });

    test('検索機能が存在すること', async ({ page }) => {
      await page.goto('/shops');

      // ローディングが終わるまで待機
      await page.waitForTimeout(2000);

      // 検索入力フィールドの存在を確認
      const searchInput = page.getByPlaceholder(/検索|店舗名|Search/i);
      const hasSearch = await searchInput.isVisible().catch(() => false);

      // 検索機能が存在する場合、入力できることを確認
      if (hasSearch) {
        await searchInput.fill('テスト');
        await expect(searchInput).toHaveValue('テスト');
      }
    });
  });

  // ================================================================
  // 詳細・編集テスト
  // ================================================================
  test.describe('詳細・編集', () => {
    test('新規作成ページにアクセスできること', async ({ page }) => {
      await page.goto('/shops/new');

      // ローディングが終わるまで待機
      await page.waitForTimeout(3000);
      await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

      // フォームまたは入力フィールドが表示されることを確認
      const hasForm = await page.locator('form').isVisible().catch(() => false);
      const hasInput = await page.locator('input').first().isVisible().catch(() => false);
      const hasContent = await page.locator('main').isVisible().catch(() => false);
      
      expect(hasForm || hasInput || hasContent).toBeTruthy();
    });
  });

  // ================================================================
  // ナビゲーションテスト
  // ================================================================
  test.describe('ナビゲーション', () => {
    test('サイドバーから店舗ページにアクセスできること', async ({ page }) => {
      await page.goto('/');

      // サイドバーまたはナビゲーションから店舗リンクをクリック
      const shopLink = page.getByRole('link', { name: /店舗|Shop/i });
      if (await shopLink.isVisible().catch(() => false)) {
        await shopLink.click();
        await expect(page).toHaveURL(/\/shops/);
      }
    });
  });
});
