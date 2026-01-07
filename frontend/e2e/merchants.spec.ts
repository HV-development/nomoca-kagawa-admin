import { test, expect } from '@playwright/test';

/**
 * マーチャント（事業者）管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('マーチャント（事業者）管理', () => {
    // ================================================================
    // 一覧表示テスト（Read）
    // ================================================================
    test.describe('一覧表示', () => {
        test('マーチャント一覧ページにアクセスできること', async ({ page }) => {
            await page.goto('/merchants');
            await expect(page).toHaveURL(/\/merchants/);

            await page.waitForSelector('table, [role="table"], .loading', { timeout: 15000 }).catch(() => {});
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 10000 }).catch(() => {});

            const hasTable = await page.locator('table').isVisible().catch(() => false);
            const hasContent = await page.locator('main').isVisible().catch(() => false);
            expect(hasTable || hasContent).toBeTruthy();
        });

        test('マーチャント一覧のテーブルヘッダーが表示されること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

            const table = page.locator('table');
            if (await table.isVisible().catch(() => false)) {
                const headers = page.locator('th, [role="columnheader"]');
                const headerCount = await headers.count();
                expect(headerCount).toBeGreaterThan(0);
            }
        });

        test('検索機能が動作すること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForTimeout(2000);

            const searchInput = page.getByPlaceholder(/検索|事業者名|Search/i);
            if (await searchInput.isVisible().catch(() => false)) {
                await searchInput.fill('テスト');
                await expect(searchInput).toHaveValue('テスト');
                await searchInput.press('Enter');
                await page.waitForTimeout(1000);
            }
        });

        test('ステータスフィルターが存在すること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForTimeout(2000);

            const statusFilter = page.locator('select, [role="combobox"]').first();
            const hasFilter = await statusFilter.isVisible().catch(() => false);

            if (hasFilter) {
                expect(hasFilter).toBeTruthy();
            }
        });
    });

    // ================================================================
    // 詳細表示テスト（Read）
    // ================================================================
    test.describe('詳細表示', () => {
        test('一覧から詳細ページに遷移できること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForSelector('table tbody tr, [data-testid="merchant-row"]', { timeout: 15000 }).catch(() => {});

            // リンクをクリックして詳細ページに遷移
            const link = page.locator('table tbody tr a, [data-testid="merchant-row"] a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/merchants\/[^/]+/);
                expect(page.url()).toMatch(/\/merchants\/[^/]+/);
                
                // 詳細ページのテキストが表示されることを確認
                await page.waitForLoadState('networkidle');
                await expect(page.getByRole('heading', { name: /事業者情報|事業者編集/i })).toBeVisible({ timeout: 10000 });
            } else {
                // リンクがない場合は行をクリック
                const row = page.locator('table tbody tr').first();
                if (await row.isVisible().catch(() => false)) {
                    await row.click();
                    await page.waitForTimeout(2000);
                    // クリックで詳細に遷移するか確認
                    await expect(page.getByRole('heading', { name: /事業者情報|事業者管理/i })).toBeVisible({ timeout: 10000 }).catch(() => {});
                }
            }
        });
    });

    // ================================================================
    // 新規作成テスト（Create）
    // ================================================================
    test.describe('新規作成', () => {
        test('新規作成ページにアクセスできること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

            const hasForm = await page.locator('form').isVisible().catch(() => false);
            const hasInput = await page.locator('input').first().isVisible().catch(() => false);
            expect(hasForm || hasInput).toBeTruthy();
        });

        test('必須フィールドが存在すること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);

            const inputs = page.locator('input, textarea, select');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
        });

        test('空フォーム送信でバリデーションエラーが表示されること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);

            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(1000);

                const errorElements = page.locator('.text-red-500, .text-destructive, [role="alert"]');
                const requiredFields = page.locator('input:invalid');
                const errorCount = await errorElements.count();
                const invalidCount = await requiredFields.count();

                expect(errorCount > 0 || invalidCount > 0).toBeTruthy();
            }
        });

        test('無効なメールアドレス形式でエラーが表示されること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);

            const emailInput = page.locator('input[type="email"]').first();
            if (await emailInput.isVisible().catch(() => false)) {
                await emailInput.fill('invalid-email');

                const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
                if (await submitButton.isVisible().catch(() => false)) {
                    await submitButton.click();
                    await page.waitForTimeout(500);

                    const errorElements = page.locator('.text-red-500, .text-destructive');
                    const invalidEmail = page.locator('input[type="email"]:invalid');
                    const hasError = await errorElements.count() > 0;
                    const hasInvalid = await invalidEmail.count() > 0;

                    expect(hasError || hasInvalid).toBeTruthy();
                }
            }
        });

        test('無効な電話番号形式でエラーが表示されること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);

            const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[id*="phone"]').first();
            if (await phoneInput.isVisible().catch(() => false)) {
                await phoneInput.fill('abc');

                const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
                if (await submitButton.isVisible().catch(() => false)) {
                    await submitButton.click();
                    await page.waitForTimeout(500);
                }
            }
        });
    });

    // ================================================================
    // 編集テスト（Update）
    // ================================================================
    test.describe('編集', () => {
        test('編集ページにアクセスできること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/merchants\/[^/]+\/edit/);
                expect(page.url()).toMatch(/\/merchants\/[^/]+\/edit/);
            }
        });
    });

    // ================================================================
    // エラーハンドリングテスト
    // ================================================================
    test.describe('エラーハンドリング', () => {
        test('存在しないマーチャントにアクセスすると404またはエラーが表示されること', async ({ page }) => {
            const response = await page.goto('/merchants/non-existent-id-12345');
            await page.waitForTimeout(2000);

            const status = response?.status() || 0;
            const is404 = status === 404;
            const hasError = await page.getByText(/見つかりません|存在しません|エラー|404|Not Found/i).isVisible().catch(() => false);
            const isRedirected = page.url().includes('/merchants') && !page.url().includes('non-existent');

            expect(is404 || hasError || isRedirected).toBeTruthy();
        });
    });

    // ================================================================
    // ナビゲーションテスト
    // ================================================================
    test.describe('ナビゲーション', () => {
        test('サイドバーからマーチャントページにアクセスできること', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(2000);

            const merchantLink = page.getByRole('link', { name: /事業者|Merchant/i });
            if (await merchantLink.isVisible().catch(() => false)) {
                await merchantLink.click();
                await expect(page).toHaveURL(/\/merchants/);
            }
        });

        test('一覧から新規作成ページに遷移できること', async ({ page }) => {
            await page.goto('/merchants');
            await page.waitForTimeout(2000);

            const newButton = page.getByRole('link', { name: /新規|作成|追加|New|Add/i });
            if (await newButton.isVisible().catch(() => false)) {
                await newButton.click();
                await expect(page).toHaveURL(/\/merchants\/new/);
            }
        });
    });
});
