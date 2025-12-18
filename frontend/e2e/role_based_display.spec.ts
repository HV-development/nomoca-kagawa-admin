import { test, expect } from '@playwright/test';

test.describe('権限別の表示内容確認', () => {
    // ----------------------------------------------------------------
    // 1. Sysadmin (管理者 - 全権限)
    // ----------------------------------------------------------------
    test.describe('Sysadmin Role', () => {
        test.beforeEach(async ({ page }) => {
            // Mock API responses for Sysadmin login
            await page.route('**/api/me', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        accountType: 'admin',
                        email: 'sysadmin@example.com',
                        role: 'sysadmin'
                    })
                });
            });

            // Mock users list API to return dummy data with sensitive info
            await page.route('**/api/admin/users*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        users: [
                            {
                                id: 'user1',
                                nickname: 'Test User 1',
                                postalCode: '123-4567',
                                prefecture: '東京都',
                                city: '新宿区',
                                address: '西新宿1-1-1',
                                birthDate: '1990-01-01',
                                gender: 1, // Male
                                saitamaAppId: 'STM001',
                                rank: 1,
                                registeredAt: '2023-01-01'
                            }
                        ],
                        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
                    })
                });
            });

            // Set cookie to simulate logged-in state
            await page.context().addCookies([{
                name: 'accessToken',
                value: 'mock_sysadmin_token',
                domain: 'localhost',
                path: '/'
            }]);

            // Go to users page
            await page.goto('/users');
        });

        test('ユーザー一覧で機密情報（郵便番号、住所等）が表示されること', async ({ page }) => {
            // Check table headers
            await expect(page.getByRole('columnheader', { name: '郵便番号' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: '住所' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: '生年月日' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: '性別' })).toBeVisible();

            // Check table cell content
            await expect(page.getByRole('cell', { name: '123-4567' })).toBeVisible();
            await expect(page.getByRole('cell', { name: '東京都新宿区西新宿1-1-1' })).toBeVisible();
        });
    });

    // ----------------------------------------------------------------
    // 2. Operator (一般 - 制限付き管理者)
    // ----------------------------------------------------------------
    test.describe('Operator Role', () => {
        test.beforeEach(async ({ page }) => {
            // Mock API responses for Operator login
            await page.route('**/api/me', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        accountType: 'admin',
                        email: 'operator@example.com',
                        role: 'operator'
                    })
                });
            });

            // Mock users list API (backend should filter, but here we mock return 
            // to verify frontend cleanup if any, though frontend relies on `isOperatorRole` flag)
            await page.route('**/api/admin/users*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        users: [
                            {
                                id: 'user1',
                                nickname: 'Test User 1',
                                // Even if backend sends it, frontend might hide it
                                postalCode: '123-4567',
                                rank: 1,
                                registeredAt: '2023-01-01'
                            }
                        ],
                        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
                    })
                });
            });

            await page.context().addCookies([{
                name: 'accessToken',
                value: 'mock_operator_token',
                domain: 'localhost',
                path: '/'
            }]);

            await page.goto('/users');
        });

        test('ユーザー一覧で機密情報（郵便番号、住所等）が表示されないこと', async ({ page }) => {
            // Check table headers are ABSENT
            await expect(page.getByRole('columnheader', { name: '郵便番号' })).not.toBeVisible();
            await expect(page.getByRole('columnheader', { name: '住所' })).not.toBeVisible();
            await expect(page.getByRole('columnheader', { name: '生年月日' })).not.toBeVisible();
            await expect(page.getByRole('columnheader', { name: '性別' })).not.toBeVisible();

            // Check content is absent
            await expect(page.getByRole('cell', { name: '123-4567' })).not.toBeVisible();
        });
    });

    // ----------------------------------------------------------------
    // 3. Merchant (事業者)
    // ----------------------------------------------------------------
    test.describe('Merchant Role', () => {
        test.beforeEach(async ({ page }) => {
            await page.route('**/api/me', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        accountType: 'merchant',
                        email: 'merchant@example.com',
                        merchantId: 'merchant123'
                    })
                });
            });

            await page.context().addCookies([{
                name: 'accessToken',
                value: 'mock_merchant_token',
                domain: 'localhost',
                path: '/'
            }]);

            // Go to a page available to merchants, e.g., root which redirects or shops
            await page.goto('/merchants');
        });

        test('サイドバーに「ユーザー管理」「管理者アカウント」が表示されないこと', async ({ page }) => {
            // Sidebar items
            // "ユーザー管理" should be hidden
            const userLink = page.getByRole('link', { name: 'ユーザー管理' });
            await expect(userLink).not.toBeVisible();

            // "管理者アカウント" should be hidden
            const adminLink = page.getByRole('link', { name: '管理者アカウント' });
            await expect(adminLink).not.toBeVisible();

            // Should see "店舗管理"
            await expect(page.getByRole('link', { name: '店舗管理' })).toBeVisible();
        });
    });

    // ----------------------------------------------------------------
    // 4. Shop (店舗)
    // ----------------------------------------------------------------
    test.describe('Shop Role', () => {
        test.beforeEach(async ({ page }) => {
            await page.route('**/api/me', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        accountType: 'shop',
                        email: 'shop@example.com',
                        shopId: 'shop123'
                    })
                });
            });

            await page.context().addCookies([{
                name: 'accessToken',
                value: 'mock_shop_token',
                domain: 'localhost',
                path: '/'
            }]);

            await page.goto('/shops');
        });

        test('サイドバーに許可されたメニューのみ表示されること', async ({ page }) => {
            // Visible
            await expect(page.getByRole('link', { name: '店舗管理' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'クーポン管理' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'クーポン利用履歴' })).toBeVisible();

            // Hidden
            await expect(page.getByRole('link', { name: '事業者管理' })).not.toBeVisible();
            await expect(page.getByRole('link', { name: 'ユーザー管理' })).not.toBeVisible();
            await expect(page.getByRole('link', { name: '管理者アカウント' })).not.toBeVisible();
        });
    });
});
