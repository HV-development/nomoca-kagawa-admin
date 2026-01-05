import { test as setup, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'nomoca-admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'nomoca-admin123';
const authFile = '.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
    // コンソールとエラーを監視
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('[Console Error]', msg.text());
        }
    });
    page.on('pageerror', error => console.log('[Page Error]', error.message));
    page.on('request', req => {
        if (req.url().includes('/api/')) {
            console.log('[Request]', req.method(), req.url());
        }
    });
    page.on('response', resp => {
        if (resp.url().includes('/api/')) {
            console.log('[Response]', resp.status(), resp.url());
        }
    });

    console.log('[Auth Setup] Starting...');
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // フォームが完全に読み込まれるまで待機
    await page.waitForSelector('#email', { timeout: 30000 });
    await page.waitForSelector('#password', { timeout: 30000 });
    
    // 入力フィールドが有効になるまで待機
    await page.waitForFunction(() => {
        const emailInput = document.querySelector('#email') as HTMLInputElement;
        const passwordInput = document.querySelector('#password') as HTMLInputElement;
        return emailInput && !emailInput.disabled && passwordInput && !passwordInput.disabled;
    }, { timeout: 30000 });

    // 入力
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeEnabled({ timeout: 10000 });
    await emailInput.fill(ADMIN_EMAIL);
    
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeEnabled({ timeout: 10000 });
    await passwordInput.fill(ADMIN_PASSWORD);
    
    console.log('[Auth Setup] Form filled, waiting...');
    await page.waitForTimeout(500);

    // ボタンをクリック（ログインボタンが有効になるまで待機）
    const button = page.locator('button').filter({ hasText: /ログイン/ }).first();
    await expect(button).toBeEnabled({ timeout: 10000 });
    console.log('[Auth Setup] Button enabled:', await button.isEnabled());
    
    // クリック実行
    console.log('[Auth Setup] Clicking...');
    await button.click();
    
    // 待機（ログイン成功または失敗を待つ）
    console.log('[Auth Setup] Waiting for response...');
    
    // ログイン成功を待機（URLが/loginから変わる、またはアクセストークンが設定される）
    try {
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
        console.log('[Auth Setup] Redirected from login page');
    } catch (e) {
        // URLが変わらない場合、アクセストークンの設定を待つ
        await page.waitForTimeout(3000);
    }

    console.log('[Auth Setup] Final URL:', page.url());
    
    const cookies = await page.context().cookies();
    const accessToken = cookies.find(c => c.name.includes('accessToken') || c.name.includes('token'));
    
    // ログイン成功の判定：URLが/loginでない、またはアクセストークンが存在する
    const isLoggedIn = !page.url().includes('/login') || accessToken;
    
    if (isLoggedIn) {
        console.log('[Auth Setup] Login successful!');
        await page.context().storageState({ path: authFile });
    } else {
        // スクリーンショットを保存
        await page.screenshot({ path: 'test-results/login-debug.png', fullPage: true });
        console.log('[Auth Setup] Cookies:', cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));
        throw new Error('[Auth Setup] Login failed - URL: ' + page.url());
    }
});
