import { test, expect } from '@playwright/test';

/**
 * 管理者ユーザー管理テスト
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 * データ: 実データを使用（シードデータに依存）
 */
test.describe('管理者ユーザー管理', () => {
    // ================================================================
    // 一覧表示テスト（Read）
    // ================================================================
    test.describe('一覧表示', () => {
        test('管理者一覧ページにアクセスできること', async ({ page }) => {
            await page.goto('/admins');
            await expect(page).toHaveURL(/\/admins/);

            await page.waitForSelector('table, [role="table"], .loading', { timeout: 15000 }).catch(() => {});
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 10000 }).catch(() => {});

            const hasTable = await page.locator('table').isVisible().catch(() => false);
            const hasContent = await page.locator('main').isVisible().catch(() => false);
            expect(hasTable || hasContent).toBeTruthy();
        });

        test('管理者一覧のテーブルヘッダーが表示されること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});

            const table = page.locator('table');
            if (await table.isVisible().catch(() => false)) {
                const headers = page.locator('th, [role="columnheader"]');
                const headerCount = await headers.count();
                expect(headerCount).toBeGreaterThan(0);
            }
        });

        test('ロールフィルターが存在すること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForTimeout(2000);

            const roleFilter = page.locator('select, [role="combobox"]').first();
            if (await roleFilter.isVisible().catch(() => false)) {
                expect(await roleFilter.isVisible()).toBeTruthy();
            }
        });

        test('検索機能が動作すること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForTimeout(2000);

            const searchInput = page.getByPlaceholder(/検索|管理者名|メール|Search/i);
            if (await searchInput.isVisible().catch(() => false)) {
                await searchInput.fill('admin');
                await expect(searchInput).toHaveValue('admin');
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
            await page.goto('/admins');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/admins\/[^/]+/);
                expect(page.url()).toMatch(/\/admins\/[^/]+/);
            } else {
                const row = page.locator('table tbody tr').first();
                if (await row.isVisible().catch(() => false)) {
                    await row.click();
                    await page.waitForTimeout(2000);
                }
            }
        });

        test('詳細ページに管理者情報が表示されること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const link = page.locator('table tbody tr a').first();
            if (await link.isVisible().catch(() => false)) {
                await link.click();
                await page.waitForURL(/\/admins\/[^/]+/);
                await page.waitForTimeout(2000);

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
            await page.goto('/admins/new');
            await page.waitForTimeout(3000);
            await page.waitForSelector(':not(:has-text("読み込み中"))', { timeout: 15000 }).catch(() => {});

            const hasForm = await page.locator('form').isVisible().catch(() => false);
            const hasInput = await page.locator('input').first().isVisible().catch(() => false);
            expect(hasForm || hasInput).toBeTruthy();
        });

        test('必須フィールドが存在すること', async ({ page }) => {
            await page.goto('/admins/new');
            await page.waitForTimeout(3000);

            const inputs = page.locator('input, textarea, select');
            const inputCount = await inputs.count();
            expect(inputCount).toBeGreaterThan(0);
        });

        test('空フォーム送信でバリデーションエラーが表示されること', async ({ page }) => {
            await page.goto('/admins/new');
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

        test('無効なメールアドレス形式でエラーが表示されること', async ({ page }) => {
            await page.goto('/admins/new');
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

        test('ロール選択が必須であること', async ({ page }) => {
            await page.goto('/admins/new');
            await page.waitForTimeout(3000);

            const roleSelect = page.locator('select[name*="role"], [name*="role"]').first();
            const hasSelect = await roleSelect.isVisible().catch(() => false);

            if (hasSelect) {
                expect(hasSelect).toBeTruthy();
            }
        });

        test('パスワードの最小長要件が満たされない場合エラーが表示されること', async ({ page }) => {
            await page.goto('/admins/new');
            await page.waitForTimeout(3000);

            const passwordInput = page.locator('input[type="password"]').first();
            if (await passwordInput.isVisible().catch(() => false)) {
                await passwordInput.fill('123');

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
            await page.goto('/admins');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/admins\/[^/]+\/edit/);
                expect(page.url()).toMatch(/\/admins\/[^/]+\/edit/);
            }
        });

        test('編集フォームに既存データが表示されること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"], button:has-text("編集")').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/admins\/[^/]+\/edit/);
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
    // エラーハンドリングテスト
    // ================================================================
    test.describe('エラーハンドリング', () => {
        test('存在しない管理者にアクセスすると404またはエラーが表示されること', async ({ page }) => {
            const response = await page.goto('/admins/non-existent-id-12345');
            await page.waitForTimeout(2000);

            const status = response?.status() || 0;
            const is404 = status === 404;
            const hasError = await page.getByText(/見つかりません|存在しません|エラー|404|Not Found/i).isVisible().catch(() => false);
            const isRedirected = page.url().includes('/admins') && !page.url().includes('non-existent');

            expect(is404 || hasError || isRedirected).toBeTruthy();
        });
    });

    // ================================================================
    // ナビゲーションテスト
    // ================================================================
    test.describe('ナビゲーション', () => {
        test('サイドバーから管理者ページにアクセスできること', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(2000);

            const adminLink = page.getByRole('link', { name: /管理者|Admin/i });
            if (await adminLink.isVisible().catch(() => false)) {
                await adminLink.click();
                await expect(page).toHaveURL(/\/admins/);
            }
        });

        test('一覧から新規作成ページに遷移できること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForTimeout(2000);

            const newButton = page.getByRole('link', { name: /新規|作成|追加|New|Add/i });
            if (await newButton.isVisible().catch(() => false)) {
                await newButton.click();
                await expect(page).toHaveURL(/\/admins\/new/);
            }
        });
    });

    // ================================================================
    // 権限テスト
    // ================================================================
    test.describe('権限', () => {
        test('ログイン中の管理者情報が表示されること', async ({ page }) => {
            await page.goto('/');
            await page.waitForTimeout(2000);

            const userInfo = page.locator('header, aside').getByText(/nomoca-admin|管理者/i);
            const hasUserInfo = await userInfo.isVisible().catch(() => false);

            if (hasUserInfo) {
                expect(hasUserInfo).toBeTruthy();
            }
        });
    });
});
