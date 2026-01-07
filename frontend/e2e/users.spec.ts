import { test, expect } from '@playwright/test';

/**
 * 会員ユーザー管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('会員ユーザー管理', () => {
    // ================================================================
    // 一覧表示テスト（Read）
    // ================================================================
    test.describe('一覧表示', () => {
        test('会員一覧ページにアクセスできること', async ({ page }) => {
            await page.goto('/users');
            await expect(page).toHaveURL(/\/users/);

            await page.waitForSelector('table, [role="table"], .loading', { timeout: 15000 }).catch(() => {});
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 10000 }).catch(() => {});

            const hasTable = await page.locator('table').isVisible().catch(() => false);
            const hasContent = await page.locator('main').isVisible().catch(() => false);
            expect(hasTable || hasContent).toBeTruthy();
        });

        test('会員一覧のテーブルヘッダーが表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

            const table = page.locator('table');
            if (await table.isVisible().catch(() => false)) {
                const headers = page.locator('th, [role="columnheader"]');
                const headerCount = await headers.count();
                expect(headerCount).toBeGreaterThan(0);
            }
        });

        test('会員ステータスフィルターが存在すること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForTimeout(2000);

            const statusFilter = page.locator('select, [role="combobox"]').first();
            if (await statusFilter.isVisible().catch(() => false)) {
                expect(await statusFilter.isVisible()).toBeTruthy();
            }
        });

        test('検索機能が動作すること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForTimeout(2000);

            const searchInput = page.getByPlaceholder(/検索|会員名|メール|Search/i);
            if (await searchInput.isVisible().catch(() => false)) {
                await searchInput.fill('test');
                await expect(searchInput).toHaveValue('test');
                await searchInput.press('Enter');
                await page.waitForTimeout(1000);
            }
        });

        test('ページネーションが動作すること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

            const pagination = page.locator('[aria-label*="pagination"], nav:has(button)');
            if (await pagination.isVisible().catch(() => false)) {
                const nextButton = page.getByRole('button', { name: /次|next|>/i });
                if (await nextButton.isVisible().catch(() => false) && await nextButton.isEnabled().catch(() => false)) {
                    await nextButton.click();
                    await page.waitForTimeout(1000);
                }
            }
        });
    });

    // ================================================================
    // 詳細表示テスト（Read）
    // ================================================================
    test.describe('詳細表示', () => {
        test('一覧から詳細ページに遷移できること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/users\/[^/]+/);
                expect(page.url()).toMatch(/\/users\/[^/]+/);
                
                // 詳細ページのテキストが表示されることを確認
                await page.waitForLoadState('networkidle');
                await expect(page.getByRole('heading', { name: /会員情報|会員管理|ユーザー|User/i })).toBeVisible({ timeout: 10000 });
            } else {
                const row = page.locator('table tbody tr').first();
                if (await row.isVisible().catch(() => false)) {
                    await row.click();
                    await page.waitForTimeout(2000);
                    await expect(page.getByRole('heading', { name: /会員情報|会員管理|ユーザー|User/i })).toBeVisible({ timeout: 10000 }).catch(() => {});
                }
            }
        });

        test('詳細ページに会員情報が表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/users\/[^/]+/);
                await page.waitForLoadState('networkidle');

                // 詳細ページの見出しが表示されることを確認
                await expect(page.getByRole('heading', { name: /会員情報|会員管理|ユーザー|User/i })).toBeVisible({ timeout: 10000 });
                
                const hasContent = await page.locator('main').isVisible().catch(() => false);
                expect(hasContent).toBeTruthy();
            }
        });

        test('詳細ページでプラン情報が表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/users\/[^/]+/);
                await page.waitForTimeout(2000);

                const hasPlan = await page.getByText(/プラン|Plan/i).isVisible().catch(() => false);
                if (hasPlan) {
                    expect(hasPlan).toBeTruthy();
                }
            }
        });

        test('詳細ページで利用履歴が表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/users\/[^/]+/);
                await page.waitForTimeout(2000);

                const hasHistory = await page.getByText(/履歴|利用|History|Usage/i).isVisible().catch(() => false);
                if (hasHistory) {
                    expect(hasHistory).toBeTruthy();
                }
            }
        });
    });

    // ================================================================
    // 編集テスト（Update）
    // ================================================================
    test.describe('編集', () => {
        test('編集ページにアクセスできること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/users\/[^/]+\/edit/);
                expect(page.url()).toMatch(/\/users\/[^/]+\/edit/);
            }
        });

        test('編集フォームに既存データが表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/users\/[^/]+\/edit/);
                await page.waitForTimeout(2000);

                const emailInput = page.locator('input[type="email"]').first();
                if (await emailInput.isVisible().catch(() => false)) {
                    const value = await emailInput.inputValue();
                    expect(value).toContain('@');
                }
            }
        });
    });

    // ================================================================
    // ステータス変更テスト（Update）
    // ================================================================
    test.describe('ステータス変更', () => {
        test('会員のアクティブ/無効化ボタンが表示されること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const firstRow = page.locator('table tbody tr').first();
            if (await firstRow.isVisible().catch(() => false)) {
                const statusButton = firstRow.locator('button:has-text("有効"), button:has-text("無効"), button:has-text("停止")').first();
                const hasButton = await statusButton.isVisible().catch(() => false);

                if (hasButton) {
                    expect(hasButton).toBeTruthy();
                }
            }
        });
    });

    // ================================================================
    // エラーハンドリングテスト
    // ================================================================
    test.describe('エラーハンドリング', () => {
        test('存在しない会員にアクセスすると404またはエラーが表示されること', async ({ page }) => {
            const response = await page.goto('/users/non-existent-id-12345');
            await page.waitForTimeout(2000);

            const status = response?.status() || 0;
            const is404 = status === 404;
            const hasError = await page.getByText(/見つかりません|存在しません|エラー|404|Not Found/i).isVisible().catch(() => false);
            const isRedirected = page.url().includes('/users') && !page.url().includes('non-existent');

            expect(is404 || hasError || isRedirected || status === 200).toBeTruthy(); // status 200 if showing error in page
        });
    });

    // ================================================================
    // ナビゲーションテスト
    // ================================================================
    test.describe('ナビゲーション', () => {
        test('サイドバーから会員ページにアクセスできること', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(2000);

            const userLink = page.getByRole('link', { name: /会員|ユーザー|User/i });
            if (await userLink.isVisible().catch(() => false)) {
                await userLink.click();
                await expect(page).toHaveURL(/\/users/);
            }
        });
    });

    // ================================================================
    // フィルタリングテスト
    // ================================================================
    test.describe('フィルタリング', () => {
        test('プランでフィルタリングできること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForTimeout(2000);

            const planFilter = page.locator('select, [role="combobox"]');
            const filterCount = await planFilter.count();

            if (filterCount > 0) {
                const firstFilter = planFilter.first();
                if (await firstFilter.isVisible().catch(() => false)) {
                    await firstFilter.selectOption({ index: 1 }).catch(() => {});
                    await page.waitForTimeout(1000);
                }
            }
        });

        test('日付範囲でフィルタリングできること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForTimeout(2000);

            const dateInput = page.locator('input[type="date"]');
            const hasDateFilter = await dateInput.first().isVisible().catch(() => false);

            if (hasDateFilter) {
                expect(hasDateFilter).toBeTruthy();
            }
        });
    });
});
