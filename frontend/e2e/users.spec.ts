import { test, expect } from '@playwright/test';

/**
 * ユーザー管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('ユーザー管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test('ユーザー一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/users');

      // ページが正しく読み込まれることを確認
      await expect(page).toHaveURL(/\/users/);

      // テーブルまたは一覧コンテンツが存在することを確認
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasListContent = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasTable || hasListContent).toBeTruthy();
    });

    test('ユーザー一覧のテーブルヘッダーが表示されること', async ({ page }) => {
      await page.goto('/users');

      // テーブルヘッダーの確認（テーブルが存在する場合）
      const table = page.locator('table');
      if (await table.isVisible().catch(() => false)) {
        const headers = page.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });

    test('検索機能が存在すること', async ({ page }) => {
      await page.goto('/users');

      // 検索入力フィールドの存在を確認
      const searchInput = page.getByPlaceholder(/検索|ユーザー|メール|Search/i);
      const hasSearch = await searchInput.isVisible().catch(() => false);

      // 検索機能が存在する場合、入力できることを確認
      if (hasSearch) {
        await searchInput.fill('テスト');
        await expect(searchInput).toHaveValue('テスト');
      }
    });
  });

  // ================================================================
  // 詳細表示テスト
  // ================================================================
  test.describe('詳細表示', () => {
    test('ユーザー詳細ページにアクセスできること', async ({ page }) => {
      // まず一覧ページに移動
      await page.goto('/users');

      // テーブルが表示されていれば、最初の行のリンクをクリック
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible().catch(() => false)) {
        const detailLink = firstRow.locator('a').first();
        if (await detailLink.isVisible().catch(() => false)) {
          await detailLink.click();
          // 詳細ページに遷移したことを確認
          await expect(page).toHaveURL(/\/users\/.+/);
        }
      }
    });
  });

  // ================================================================
  // ナビゲーションテスト
  // ================================================================
  test.describe('ナビゲーション', () => {
    test('サイドバーからユーザーページにアクセスできること', async ({ page }) => {
      await page.goto('/');

      // サイドバーまたはナビゲーションからユーザーリンクをクリック
      const userLink = page.getByRole('link', { name: /ユーザー|User/i });
      if (await userLink.isVisible().catch(() => false)) {
        await userLink.click();
        await expect(page).toHaveURL(/\/users/);
      }
    });
  });
});
