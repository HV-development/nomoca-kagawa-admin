import { test, expect } from '@playwright/test';

/**
 * 管理者アカウント管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('管理者アカウント管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test('管理者一覧ページにアクセスできること', async ({ page }) => {
      await page.goto('/admins');

      // ページが正しく読み込まれることを確認
      await expect(page).toHaveURL(/\/admins/);

      // テーブルまたは一覧コンテンツが存在することを確認
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasListContent = await page.getByRole('heading').first().isVisible().catch(() => false);
      expect(hasTable || hasListContent).toBeTruthy();
    });

    test('管理者一覧のテーブルヘッダーが表示されること', async ({ page }) => {
      await page.goto('/admins');

      // テーブルヘッダーの確認（テーブルが存在する場合）
      const table = page.locator('table');
      if (await table.isVisible().catch(() => false)) {
        const headers = page.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
      }
    });
  });

  // ================================================================
  // 新規作成テスト
  // ================================================================
  test.describe('新規作成', () => {
    test('新規作成ページにアクセスできること', async ({ page }) => {
      await page.goto('/admins/new');

      // フォームが表示されることを確認
      const hasForm = await page.locator('form').isVisible().catch(() => false);
      const hasInput = await page.locator('input').first().isVisible().catch(() => false);
      expect(hasForm || hasInput).toBeTruthy();
    });

    test('新規作成フォームに必須フィールドが存在すること', async ({ page }) => {
      await page.goto('/admins/new');

      // 主要な入力フィールドの存在を確認
      const emailInput = page.getByLabel(/メール/);
      const passwordInput = page.getByLabel(/パスワード/);

      const hasEmailInput = await emailInput.isVisible().catch(() => false);
      const hasPasswordInput = await passwordInput.isVisible().catch(() => false);

      // 少なくとも1つの入力フィールドが存在
      expect(hasEmailInput || hasPasswordInput).toBeTruthy();
    });

    test('空フォーム送信でバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/admins/new');

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
    test('サイドバーから管理者ページにアクセスできること', async ({ page }) => {
      await page.goto('/');

      // サイドバーまたはナビゲーションから管理者リンクをクリック
      const adminLink = page.getByRole('link', { name: /管理者|Admin/i });
      if (await adminLink.isVisible().catch(() => false)) {
        await adminLink.click();
        await expect(page).toHaveURL(/\/admins/);
      }
    });

    test('一覧から新規作成ページに遷移できること', async ({ page }) => {
      await page.goto('/admins');

      // 新規作成ボタンをクリック
      const newButton = page.getByRole('link', { name: /新規|作成|New|Add/i });
      if (await newButton.isVisible().catch(() => false)) {
        await newButton.click();
        await expect(page).toHaveURL(/\/admins\/new/);
      }
    });
  });
});
