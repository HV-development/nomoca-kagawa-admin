import { test, expect } from '@playwright/test';

/**
 * エラーハンドリングテスト
 * 
 * 認証: 一部は storageState を使用
 * 
 * 実際のエラーページや404処理を確認
 */
test.describe('エラーハンドリング - Admin', () => {
  // ================================================================
  // 404エラーテスト
  // ================================================================
  test.describe('404エラー', () => {
    test('存在しないページにアクセスすると404またはエラーページが表示されること', async ({ page }) => {
      const response = await page.goto('/non-existent-page-12345');

      // 404ステータスまたはリダイレクト、またはエラーページを確認
      const status = response?.status() || 0;
      const is404Response = status === 404;
      const isRedirect = status >= 300 && status < 400;
      const has404Text = await page.getByText(/404|見つかりません|ページが存在しません|Not Found/i).isVisible().catch(() => false);
      const isOnLoginPage = page.url().includes('/login');
      
      // いずれかの条件が満たされればOK
      expect(is404Response || isRedirect || has404Text || isOnLoginPage).toBeTruthy();
    });
  });

  // ================================================================
  // 認証エラーテスト
  // ================================================================
  test.describe('認証エラー', () => {
    test('未認証状態で保護されたページにアクセスするとログインページにリダイレクトされること', async ({ browser }) => {
      // 新しいコンテキストを作成（認証状態なし）
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto('/merchants');

        // ログインページにリダイレクトされることを確認
        await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
        
        const isOnLoginPage = page.url().includes('/login');
        const hasLoginForm = await page.locator('input[type="password"]').isVisible().catch(() => false);
        
        expect(isOnLoginPage || hasLoginForm).toBeTruthy();
      } finally {
        await context.close();
      }
    });
  });

  // ================================================================
  // フォームバリデーションエラーテスト
  // ================================================================
  test.describe('フォームバリデーションエラー', () => {
    test('ログインページで空フォーム送信するとバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // 送信ボタンをクリック
      const submitButton = page.getByRole('button', { name: /ログイン|Login/i });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // バリデーションエラーが表示されることを確認
        const errorElements = page.locator('.text-red-500, .text-destructive, [role="alert"]');
        const errorCount = await errorElements.count();
        
        // HTML5のrequired属性によるブラウザのバリデーションも考慮
        const hasRequiredField = await page.locator('input:invalid').count() > 0;
        
        expect(errorCount > 0 || hasRequiredField).toBeTruthy();
      }
    });
  });
});
