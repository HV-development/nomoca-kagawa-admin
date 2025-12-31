import { test as setup, expect as _expect } from '@playwright/test';

// 環境変数からテスト用の認証情報を取得
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'nomoca-admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'nomoca-admin123';

// 認証状態を保存するファイルパス
const authFile = '.auth/admin.json';

/**
 * 認証セットアップ
 * パスワード認証を実行し、認証状態をstorageStateとして保存する
 */
setup('authenticate as admin', async ({ page }) => {
    console.log('[Auth Setup] Starting authentication...');
    console.log('[Auth Setup] Email:', ADMIN_EMAIL);

    // ログインページにアクセス
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // ログインフォームが表示されるまで待機
    await page.waitForSelector('input[type="email"], input[id="email"]', { timeout: 15000 });

    console.log('[Auth Setup] Filling login form...');

    // メールアドレスを入力
    const emailInput = page.locator('input[type="email"], input[id="email"]').first();
    await emailInput.fill(ADMIN_EMAIL);

    // パスワードを入力
    const passwordInput = page.locator('input[type="password"], input[id="password"]').first();
    await passwordInput.fill(ADMIN_PASSWORD);

    console.log('[Auth Setup] Submitting login form...');

    // ログインボタンをクリック
    await page.getByRole('button', { name: /ログイン|Login/i }).click();

    // ログイン後の遷移を待機
    console.log('[Auth Setup] Waiting for redirect after login...');

    // エラーメッセージが表示されていないことを確認しつつ、リダイレクトを待機
    let loginSuccess = false;
    const startTime = Date.now();
    const timeout = 30000;

    while (!loginSuccess && Date.now() - startTime < timeout) {
        await page.waitForTimeout(500);

        // エラーメッセージをチェック
        const errorMessage = await page.locator('.text-red-500, .text-destructive, [role="alert"]').textContent().catch(() => null);
        if (errorMessage && errorMessage.includes('正しくありません')) {
            throw new Error('[Auth Setup] Login failed: ' + errorMessage);
        }

        // URLがログインページ以外に変わったかチェック
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
            loginSuccess = true;
            console.log('[Auth Setup] Redirected to:', currentUrl);
        }

        // Cookieが設定されたかチェック
        const cookies = await page.context().cookies();
        const accessToken = cookies.find(c => c.name.includes('accessToken'));
        if (accessToken) {
            loginSuccess = true;
            console.log('[Auth Setup] Access token cookie found');
        }
    }

    if (!loginSuccess) {
        // 最終チェック
        const finalCookies = await page.context().cookies();
        const finalAccessToken = finalCookies.find(c => c.name.includes('accessToken'));
        if (!finalAccessToken) {
            const _pageContent = await page.content();
            console.log('[Auth Setup] Page URL:', page.url());
            console.log('[Auth Setup] Cookies:', finalCookies.map(c => c.name).join(', '));
            throw new Error('[Auth Setup] Login timeout - no access token found');
        }
    }

    console.log('[Auth Setup] Login successful!');

    // 認証状態を保存
    console.log('[Auth Setup] Saving authentication state...');
    await page.context().storageState({ path: authFile });

    console.log('[Auth Setup] Authentication complete!');
});
