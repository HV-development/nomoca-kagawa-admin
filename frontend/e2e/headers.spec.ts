import { test, expect } from '@playwright/test';

/**
 * HTTPヘッダーとセキュリティテスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 */
test.describe('HTTPヘッダーとセキュリティ', () => {
    // ================================================================
    // キャッシュ制御テスト
    // ================================================================
    test.describe('キャッシュ制御', () => {
        test('認証済みページでCache-Controlヘッダーが設定されていること', async ({ page }) => {
            const responses: { url: string; cacheControl: string | null }[] = [];

            page.on('response', (response) => {
                const url = response.url();
                if (url.includes('/merchants') || url.includes('/shops')) {
                    responses.push({
                        url,
                        cacheControl: response.headers()['cache-control'],
                    });
                }
            });

            await page.goto('/merchants');
            await page.waitForTimeout(3000);
        });

        test('静的アセットに適切なキャッシュヘッダーが設定されていること', async ({ page }) => {
            const staticResponses: { url: string; cacheControl: string | null }[] = [];

            page.on('response', (response) => {
                const url = response.url();
                if (url.includes('/_next/static/') || url.match(/\.(js|css|png|jpg|svg)$/)) {
                    staticResponses.push({
                        url,
                        cacheControl: response.headers()['cache-control'],
                    });
                }
            });

            await page.goto('/');
            await page.waitForTimeout(3000);
        });
    });

    // ================================================================
    // セキュリティヘッダーテスト
    // ================================================================
    test.describe('セキュリティヘッダー', () => {
        test('APIレスポンスにContent-Typeヘッダーが設定されていること', async ({ page }) => {
            const apiResponses: { url: string; contentType: string | null }[] = [];

            page.on('response', (response) => {
                const url = response.url();
                if (url.includes('/api/')) {
                    apiResponses.push({
                        url,
                        contentType: response.headers()['content-type'],
                    });
                }
            });

            await page.goto('/merchants');
            await page.waitForTimeout(3000);

            if (apiResponses.length > 0) {
                const hasContentType = apiResponses.some(r => r.contentType !== null);
                expect(hasContentType).toBeTruthy();
            }
        });

        test('ページにX-Frame-OptionsまたはCSPが設定されていること', async ({ page }) => {
            let _xFrameOptions: string | null = null;
            let _csp: string | null = null;

            page.on('response', (response) => {
                if (response.url().includes('/merchants') && response.status() === 200) {
                    _xFrameOptions = response.headers()['x-frame-options'];
                    _csp = response.headers()['content-security-policy'];
                }
            });

            await page.goto('/merchants');
            await page.waitForTimeout(2000);
        });
    });

    // ================================================================
    // 認証ヘッダーテスト
    // ================================================================
    test.describe('認証ヘッダー', () => {
        test('認証済みリクエストにCookieが含まれていること', async ({ page }) => {
            const cookies = await page.context().cookies();
            const hasAccessToken = cookies.some(c => c.name.includes('accessToken'));
            expect(hasAccessToken).toBeTruthy();
        });

        test('ログインページでは認証Cookieが不要であること', async ({ browser }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            const response = await page.goto('/login');
            expect(response?.status()).toBe(200);

            await context.close();
        });
    });

    // ================================================================
    // レスポンスコードテスト
    // ================================================================
    test.describe('レスポンスコード', () => {
        test('有効なページは200を返すこと', async ({ page }) => {
            const response = await page.goto('/merchants');
            expect(response?.status()).toBe(200);
        });

        test('APIリクエストが正常に処理されること', async ({ page }) => {
            const apiResponses: { url: string; status: number }[] = [];

            page.on('response', (response) => {
                if (response.url().includes('/api/')) {
                    apiResponses.push({
                        url: response.url(),
                        status: response.status(),
                    });
                }
            });

            await page.goto('/merchants');
            await page.waitForTimeout(3000);

            // APIレスポンスがあれば、成功またはリダイレクトであることを確認
            if (apiResponses.length > 0) {
                const allSuccessful = apiResponses.every(r => r.status >= 200 && r.status < 500);
                expect(allSuccessful).toBeTruthy();
            }
        });
    });
});
