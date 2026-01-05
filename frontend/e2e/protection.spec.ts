import { test, expect } from '@playwright/test';

/**
 * 認証保護テスト
 * 
 * 認証: なし（未認証状態をテスト）
 */
test.describe('認証保護', () => {
    // ================================================================
    // 未認証アクセステスト
    // ================================================================
    test.describe('未認証アクセス', () => {
        test('未認証で/merchantsにアクセスするとログインにリダイレクトされること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/merchants');
            await page.waitForURL(/\/login/, { timeout: 10000 });

            const isOnLogin = page.url().includes('/login');
            expect(isOnLogin).toBeTruthy();
            
            // ログインページのテキストが表示されることを確認
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            await context.close();
        });

        test('未認証で/shopsにアクセスするとログインにリダイレクトされること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/shops');
            await page.waitForURL(/\/login/, { timeout: 10000 });

            const isOnLogin = page.url().includes('/login');
            expect(isOnLogin).toBeTruthy();
            
            // ログインページのテキストが表示されることを確認
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            await context.close();
        });

        test('未認証で/couponsにアクセスするとログインにリダイレクトされること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/coupons');
            await page.waitForURL(/\/login/, { timeout: 10000 });

            const isOnLogin = page.url().includes('/login');
            expect(isOnLogin).toBeTruthy();
            
            // ログインページのテキストが表示されることを確認
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            await context.close();
        });

        test('未認証で/adminsにアクセスするとログインにリダイレクトされること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/admins');
            await page.waitForURL(/\/login/, { timeout: 10000 });

            const isOnLogin = page.url().includes('/login');
            expect(isOnLogin).toBeTruthy();
            
            // ログインページのテキストが表示されることを確認
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            await context.close();
        });

        test('未認証で/usersにアクセスするとログインにリダイレクトされること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/users');
            await page.waitForURL(/\/login/, { timeout: 10000 });

            const isOnLogin = page.url().includes('/login');
            expect(isOnLogin).toBeTruthy();
            
            // ログインページのテキストが表示されることを確認
            await expect(page.getByRole('heading', { name: /ログイン/i })).toBeVisible();

            await context.close();
        });
    });

    // ================================================================
    // ログインページアクセステスト
    // ================================================================
    test.describe('ログインページ', () => {
        test('未認証で/loginにアクセスできること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            const response = await page.goto('/login');
            expect(response?.status()).toBe(200);

            await context.close();
        });

        test('ログインフォームが表示されること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto('/login');
            await page.waitForLoadState('domcontentloaded');

            const hasEmailInput = await page.locator('input[type="email"], input[id="email"]').first().isVisible().catch(() => false);
            const hasPasswordInput = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
            const hasSubmitButton = await page.getByRole('button', { name: /ログイン/i }).isVisible().catch(() => false);

            expect(hasEmailInput && hasPasswordInput && hasSubmitButton).toBeTruthy();

            await context.close();
        });
    });

    // ================================================================
    // APIエンドポイント保護テスト
    // ================================================================
    test.describe('APIエンドポイント保護', () => {
        test('未認証でAPIにアクセスすると401が返ること', async ({ request }) => {
            const response = await request.get('/api/merchants');

            // 401または403またはリダイレクト
            const status = response.status();
            expect(status === 401 || status === 403 || status >= 300 && status < 400).toBeTruthy();
        });
    });
});
