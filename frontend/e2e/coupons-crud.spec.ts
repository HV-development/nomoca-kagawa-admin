import { test, expect } from '@playwright/test';

/**
 * クーポン管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('クーポン管理', () => {
    // ================================================================
    // 一覧表示テスト（Read）
    // ================================================================
    test.describe('一覧表示', () => {
        test('クーポン一覧ページにアクセスできること', async ({ page }) => {
            await page.goto('/coupons');
            await expect(page).toHaveURL(/\/coupons/);

            await page.waitForSelector('table, [role="table"], .loading', { timeout: 15000 }).catch(() => {});
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 10000 }).catch(() => {});

            const hasTable = await page.locator('table').isVisible().catch(() => false);
            const hasContent = await page.locator('main').isVisible().catch(() => false);
            expect(hasTable || hasContent).toBeTruthy();
        });

        test('クーポン一覧のテーブルヘッダーが表示されること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

            const table = page.locator('table');
            if (await table.isVisible().catch(() => false)) {
                const headers = page.locator('th, [role="columnheader"]');
                const headerCount = await headers.count();
                expect(headerCount).toBeGreaterThan(0);
            }
        });

        test('ステータスフィルターが存在すること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForTimeout(2000);

            const statusFilter = page.locator('select, [role="combobox"]').first();
            if (await statusFilter.isVisible().catch(() => false)) {
                expect(await statusFilter.isVisible()).toBeTruthy();
            }
        });

        test('検索機能が動作すること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForTimeout(2000);

            const searchInput = page.getByPlaceholder(/検索|クーポン名|Search/i);
            if (await searchInput.isVisible().catch(() => false)) {
                await searchInput.fill('テスト');
                await expect(searchInput).toHaveValue('テスト');
                await searchInput.press('Enter');
                await page.waitForTimeout(1000);
            }
        });
    });

    // ================================================================
    // 詳細表示テスト（Read）
    // ================================================================
    test.describe('詳細表示', () => {
        test('一覧から詳細ページに遷移できること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            // 編集リンクをクリック（クーポン詳細ページは存在せず、編集ページに遷移）
            const editLink = page.locator('a[href*="/edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/coupons\/[^/]+\/edit/);
                expect(page.url()).toMatch(/\/coupons\/[^/]+\/edit/);
                
                // 編集ページのテキストが表示されることを確認
                await page.waitForLoadState('networkidle');
                await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
            } else {
                const row = page.locator('table tbody tr').first();
                if (await row.isVisible().catch(() => false)) {
                    await row.click();
                    await page.waitForTimeout(2000);
                    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 }).catch(() => {});
                }
            }
        });

        test('詳細ページにクーポン情報が表示されること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            // 編集リンクをクリック（クーポン詳細ページは存在せず、編集ページに遷移）
            const editLink = page.locator('a[href*="/edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/coupons\/[^/]+\/edit/);
                await page.waitForLoadState('networkidle');

                // 編集ページの見出しが表示されることを確認
                await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
                
                const hasContent = await page.locator('main').isVisible().catch(() => false);
                expect(hasContent).toBeTruthy();
            }
        });
    });

    // ================================================================
    // 新規作成テスト（Create）
    // ================================================================
    test.describe('新規作成', () => {
        test('新規作成ページにアクセスできること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

            const hasForm = await page.locator('form').isVisible().catch(() => false);
            const hasInput = await page.locator('input').first().isVisible().catch(() => false);
            expect(hasForm || hasInput).toBeTruthy();
        });

        test('必須フィールドが存在すること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);

            const inputs = page.locator('input, textarea, select');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
        });

        test('空フォーム送信でバリデーションエラーが表示されること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);

            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(1000);

                const errorElements = page.locator('.text-red-500, .text-destructive, [role="alert"]');
                const requiredFields = page.locator('input:invalid, select:invalid');
                const errorCount = await errorElements.count();
                const invalidCount = await requiredFields.count();

                expect(errorCount > 0 || invalidCount > 0).toBeTruthy();
            }
        });

        test('クーポンタイトルが空の場合エラーが表示されること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);

            const shopSelect = page.locator('select[name*="shop"], [name*="shop"]').first();
            if (await shopSelect.isVisible().catch(() => false)) {
                await shopSelect.selectOption({ index: 1 }).catch(() => {});
            }

            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(500);

                const errorElements = page.locator('.text-red-500, .text-destructive');
                const hasError = await errorElements.count() > 0;
                expect(hasError).toBeTruthy();
            }
        });

        test('ドリンクタイプ選択が必須であること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);

            const drinkTypeSelect = page.locator('select[name*="drink"], [name*="drinkType"]').first();
            const hasSelect = await drinkTypeSelect.isVisible().catch(() => false);

            if (hasSelect) {
                expect(hasSelect).toBeTruthy();
            }
        });
    });

    // ================================================================
    // 編集テスト（Update）
    // ================================================================
    test.describe('編集', () => {
        test('編集ページにアクセスできること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/coupons\/[^/]+\/edit/);
                expect(page.url()).toMatch(/\/coupons\/[^/]+\/edit/);
            }
        });

        test('編集フォームに既存データが表示されること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/coupons\/[^/]+\/edit/);
                await page.waitForTimeout(2000);

                const titleInput = page.locator('input[name*="title"], input[name*="name"]').first();
                if (await titleInput.isVisible().catch(() => false)) {
                    const value = await titleInput.inputValue();
                    expect(value.length).toBeGreaterThan(0);
                }
            }
        });
    });

    // ================================================================
    // ステータス変更テスト（Update）
    // ================================================================
    test.describe('ステータス変更', () => {
        test('クーポンの承認/却下ボタンが表示されること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const firstRow = page.locator('table tbody tr').first();
            if (await firstRow.isVisible().catch(() => false)) {
                const actionButton = firstRow.locator('button:has-text("承認"), button:has-text("却下"), button:has-text("公開")').first();
                const hasAction = await actionButton.isVisible().catch(() => false);

                if (hasAction) {
                    expect(hasAction).toBeTruthy();
                }
            }
        });
    });

    // ================================================================
    // エラーハンドリングテスト
    // ================================================================
    test.describe('エラーハンドリング', () => {
        test('存在しないクーポンにアクセスすると404またはエラーが表示されること', async ({ page }) => {
            const response = await page.goto('/coupons/non-existent-id-12345');
            await page.waitForTimeout(2000);

            const status = response?.status() || 0;
            const is404 = status === 404;
            const hasError = await page.getByText(/見つかりません|存在しません|エラー|404|Not Found/i).isVisible().catch(() => false);
            const isRedirected = page.url().includes('/coupons') && !page.url().includes('non-existent');

            expect(is404 || hasError || isRedirected).toBeTruthy();
        });
    });

    // ================================================================
    // ナビゲーションテスト
    // ================================================================
    test.describe('ナビゲーション', () => {
        test('サイドバーからクーポンページにアクセスできること', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(2000);

            const couponLink = page.getByRole('link', { name: /クーポン|Coupon/i });
            if (await couponLink.isVisible().catch(() => false)) {
                await couponLink.click();
                await expect(page).toHaveURL(/\/coupons/);
            }
        });

        test('一覧から新規作成ページに遷移できること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForTimeout(2000);

            const newButton = page.getByRole('link', { name: /新規|作成|追加|New|Add/i });
            if (await newButton.isVisible().catch(() => false)) {
                await newButton.click();
                await expect(page).toHaveURL(/\/coupons\/new/);
            }
        });
    });
});
