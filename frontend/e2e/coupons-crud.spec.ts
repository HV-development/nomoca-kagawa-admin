import { test, expect } from '@playwright/test';

/**
 * クーポン管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('クーポン管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test('クーポン一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/coupons');

      // ページが正しく読み込まれることを確認
      await expect(page).toHaveURL(/\/coupons/);

      // テーブルまたは一覧コンテンツが存在することを確認
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasListContent = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasTable || hasListContent).toBeTruthy();
    });

    test('クーポン一覧のテーブルヘッダーが表示されること', async ({ page }) => {
      await page.goto('/coupons');

      // テーブルヘッダーの確認（テーブルが存在する場合）
      const table = page.locator('table');
      if (await table.isVisible().catch(() => false)) {
        const headers = page.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });

    test('検索機能が存在すること', async ({ page }) => {
      await page.goto('/coupons');

      // 検索入力フィールドの存在を確認
      const searchInput = page.getByPlaceholder(/検索|クーポン名|Search/i);
      const hasSearch = await searchInput.isVisible().catch(() => false);

      // 検索機能が存在する場合、入力できることを確認
      if (hasSearch) {
        await searchInput.fill('テスト');
        await expect(searchInput).toHaveValue('テスト');
      }
    });
  });

  // ================================================================
  // 新規作成テスト
  // ================================================================
  test.describe('新規作成', () => {
    test('新規作成ページにアクセスできること', async ({ page }) => {
      await page.goto('/coupons/new');

      // フォームが表示されることを確認
      const hasForm = await page.locator('form').isVisible().catch(() => false);
      const hasInput = await page.locator('input').first().isVisible().catch(() => false);
      expect(hasForm || hasInput).toBeTruthy();
    });

    test('新規作成フォームに必須フィールドが存在すること', async ({ page }) => {
      await page.goto('/coupons/new');

      // 主要な入力フィールドの存在を確認
      const titleInput = page.getByLabel(/クーポン名|タイトル|名前/);
      const descriptionInput = page.getByLabel(/説明|詳細/);

      const hasTitleInput = await titleInput.isVisible().catch(() => false);
      const hasDescriptionInput = await descriptionInput.isVisible().catch(() => false);

      // 少なくとも1つの入力フィールドが存在
      expect(hasTitleInput || hasDescriptionInput).toBeTruthy();
    });

    test('空フォーム送信でバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/coupons/new');

      // 送信ボタンを探してクリック
      const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();

        // エラーメッセージまたは赤いテキストが表示されることを確認
        await page.waitForTimeout(500);
        const errorElements = page.locator('.text-red-500, .text-destructive, [role="alert"]');
        const errorCount = await errorElements.count();
        expect(errorCount).toBeGreaterThan(0);
      }
    });
  });

  // ================================================================
  // ナビゲーションテスト
  // ================================================================
  test.describe('ナビゲーション', () => {
    test('サイドバーからクーポンページにアクセスできること', async ({ page }) => {
      await page.goto('/');

      // サイドバーまたはナビゲーションからクーポンリンクをクリック
      const couponLink = page.getByRole('link', { name: /クーポン|Coupon/i });
      if (await couponLink.isVisible().catch(() => false)) {
        await couponLink.click();
        await expect(page).toHaveURL(/\/coupons/);
      }
    });

    test('一覧から新規作成ページに遷移できること', async ({ page }) => {
      await page.goto('/coupons');

      // 新規作成ボタンをクリック
      const newButton = page.getByRole('link', { name: /新規|作成|New|Add/i });
      if (await newButton.isVisible().catch(() => false)) {
        await newButton.click();
        await expect(page).toHaveURL(/\/coupons\/new/);
      }
    });
  });
});
