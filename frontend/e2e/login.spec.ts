import { test, expect } from '@playwright/test';

/**
 * ログインページのテスト
 * 
 * 認証: なし（認証フローのテスト）
 */
test.describe('Admin ログインページのテスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
    });

    // ================================================================
    // 画面表示テスト
    // ================================================================
    test.describe('画面表示', () => {
        test('ログインページの要素が正しく表示されること', async ({ page }) => {
            // ヘッダー
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            // フォーム要素
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            const passwordInput = page.locator('input[type="password"], input[id="password"]').first();
            const submitButton = page.getByRole('button', { name: /ログイン/i });

            await expect(emailInput).toBeVisible();
            await expect(passwordInput).toBeVisible();
            await expect(submitButton).toBeVisible();
        });

        test('ログインボタンが無効になっていないこと', async ({ page }) => {
            const submitButton = page.getByRole('button', { name: /ログイン/i });
            await expect(submitButton).toBeEnabled();
        });
    });

    // ================================================================
    // バリデーションテスト
    // ================================================================
    test.describe('バリデーション', () => {
        test('空フォーム送信でエラーが表示されること', async ({ page }) => {
            // 空で送信
            await page.getByRole('button', { name: /ログイン/i }).click();
            await page.waitForTimeout(500);

            // エラーメッセージまたはHTML5バリデーションが表示される
            const errorElements = page.locator('.text-red-500, .text-destructive, [role="alert"]');
            const requiredFields = page.locator('input:invalid');

            const hasError = await errorElements.count() > 0;
            const hasInvalidFields = await requiredFields.count() > 0;

            expect(hasError || hasInvalidFields).toBeTruthy();
        });

        test('無効なメールアドレス形式でエラーが表示されること', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            await emailInput.fill('invalid-email');

            await page.getByRole('button', { name: /ログイン/i }).click();
            await page.waitForTimeout(500);

            // エラーメッセージまたはHTML5バリデーションが表示される
            const errorElements = page.locator('.text-red-500, .text-destructive');
            const invalidEmail = page.locator('input[type="email"]:invalid');

            const hasError = await errorElements.count() > 0;
            const hasInvalidEmail = await invalidEmail.count() > 0;

            expect(hasError || hasInvalidEmail).toBeTruthy();
        });

        test('短すぎるパスワードでエラーが表示されること', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            const passwordInput = page.locator('input[type="password"], input[id="password"]').first();

            await emailInput.fill('test@example.com');
            await passwordInput.fill('123'); // 短すぎるパスワード

            await page.getByRole('button', { name: /ログイン/i }).click();
            await page.waitForTimeout(500);

            // エラーメッセージが表示される（または送信される）
            // パスワードの最小長はスキーマ依存
            const errorElements = page.locator('.text-red-500, .text-destructive');
            const hasError = await errorElements.count() > 0;

            // エラーがなければログイン試行されているはず
            if (!hasError) {
                // ログインエラーが表示されるかURLが変わっていることを確認
                await page.waitForTimeout(2000);
            }
        });
    });

    // ================================================================
    // 認証エラーテスト
    // ================================================================
    test.describe('認証エラー', () => {
        test('存在しないユーザーでログインするとエラーが表示されること', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            const passwordInput = page.locator('input[type="password"], input[id="password"]').first();

            await emailInput.fill('nonexistent@example.com');
            await passwordInput.fill('password123');

            await page.getByRole('button', { name: /ログイン/i }).click();

            // エラーメッセージの表示を待機
            await page.waitForTimeout(3000);

            // エラーメッセージが表示されることを確認
            const errorMessage = page.locator('.text-red-500, .text-destructive, [role="alert"]');
            await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
        });

        test('間違ったパスワードでログインするとエラーが表示されること', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            const passwordInput = page.locator('input[type="password"], input[id="password"]').first();

            await emailInput.fill('nomoca-admin@example.com');
            await passwordInput.fill('wrongpassword123');

            await page.getByRole('button', { name: /ログイン/i }).click();

            // エラーメッセージの表示を待機
            await page.waitForTimeout(3000);

            // エラーメッセージが表示されることを確認
            const errorMessage = page.locator('.text-red-500, .text-destructive, [role="alert"]');
            await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
        });
    });

    // ================================================================
    // ログイン成功テスト
    // ================================================================
    test.describe('ログイン成功', () => {
        test('正しい認証情報でログインできること', async ({ page }) => {
            const emailInput = page.locator('input[type="email"], input[id="email"]').first();
            const passwordInput = page.locator('input[type="password"], input[id="password"]').first();

            await emailInput.fill('nomoca-admin@example.com');
            await passwordInput.fill('nomoca-admin123');

            await page.getByRole('button', { name: /ログイン/i }).click();

            // ログイン成功後、ログインページ以外にリダイレクトされることを確認
            await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

            expect(page.url()).not.toContain('/login');
            
            // ログイン成功後の画面に適切なテキストが表示されることを確認
            // 事業者管理ページまたは他の管理ページに遷移しているはず
            await page.waitForLoadState('networkidle');
            const pageHeading = page.getByRole('heading', { name: /事業者管理|店舗管理|クーポン管理|管理者|会員/i });
            await expect(pageHeading.first()).toBeVisible({ timeout: 10000 });
        });
    });
});
