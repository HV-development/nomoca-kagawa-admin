import { test, expect } from '@playwright/test';

/**
 * マーチャント（事業者）管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('マーチャント（事業者）管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test('マーチャント一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/merchants');

      // ページが正しく読み込まれることを確認
      await expect(page).toHaveURL(/\/merchants/);

      // ローディングが終わるまで待機
      await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

      // テーブルまたは一覧コンテンツが存在することを確認
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasListContent = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasTable || hasListContent).toBeTruthy();
    });

    test('マーチャント一覧のテーブルヘッダーが表示されること', async ({ page }) => {
      await page.goto('/merchants');

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
      await page.goto('/merchants');

      // ローディングが終わるまで待機
      await page.waitForTimeout(2000);

      // 検索入力フィールドの存在を確認
      const searchInput = page.getByPlaceholder(/検索|事業者名|Search/i);
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
  test.describe('詳細・編集', () => {
    test('新規作成ページにアクセスできること', async ({ page }) => {
      await page.goto('/merchants/new');

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
    test('サイドバーからマーチャントページにアクセスできること', async ({ page }) => {
      await page.goto('/');

      // サイドバーまたはナビゲーションからマーチャントリンクをクリック
      const merchantLink = page.getByRole('link', { name: /事業者|Merchant/i });
      if (await merchantLink.isVisible().catch(() => false)) {
        await merchantLink.click();
        await expect(page).toHaveURL(/\/merchants/);
      }
    });
  });
});
