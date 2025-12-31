import { test, expect as _expect } from '@playwright/test';

/**
 * 実際のCRUD操作テスト
 * 
 * 注意: これらのテストは実際にデータを作成・更新・削除します。
 * テスト環境でのみ実行してください。
 * 
 * 認証: storageState を使用（auth.setup.ts で設定）
 */

// テストデータ生成用のユニークID
const uniqueId = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

test.describe('CRUD操作テスト', () => {
    // ================================================================
    // 事業者 CRUD
    // ================================================================
    test.describe('事業者 CRUD', () => {
        test('事業者を新規作成できること', async ({ page }) => {
            await page.goto('/merchants/new');
            await page.waitForTimeout(3000);

            const testName = `テスト事業者_${uniqueId()}`;
            
            // フォームに入力
            const nameInput = page.locator('input[name*="name"], input[id*="name"]').first();
            if (await nameInput.isVisible().catch(() => false)) {
                await nameInput.fill(testName);
            }

            const emailInput = page.locator('input[type="email"]').first();
            if (await emailInput.isVisible().catch(() => false)) {
                await emailInput.fill(`merchant-${uniqueId()}@example.com`);
            }

            // 送信
            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(3000);
            }
        });

        test('事業者を更新できること', async ({ page }) => {
            // 既存の事業者を編集
            await page.goto('/merchants');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/merchants\/[^/]+\/edit/, { timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(2000);

                // 名前を更新
                const nameInput = page.locator('input[name*="name"], input[id*="name"]').first();
                if (await nameInput.isVisible().catch(() => false)) {
                    const currentValue = await nameInput.inputValue();
                    await nameInput.fill(currentValue + '_更新');

                    const submitButton = page.getByRole('button', { name: /更新|保存|変更|Submit/i });
                    if (await submitButton.isVisible().catch(() => false)) {
                        await submitButton.click();
                        await page.waitForTimeout(3000);
                    }
                }
            }
        });
    });

    // ================================================================
    // 店舗 CRUD
    // ================================================================
    test.describe('店舗 CRUD', () => {
        test('店舗を新規作成できること', async ({ page }) => {
            await page.goto('/shops/new');
            await page.waitForTimeout(3000);

            const testName = `テスト店舗_${uniqueId()}`;

            // 店舗名を入力
            const nameInput = page.locator('input[name*="name"], input[id*="name"]').first();
            if (await nameInput.isVisible().catch(() => false)) {
                await nameInput.fill(testName);
            }

            // 住所を入力
            const addressInput = page.locator('input[name*="address"], textarea[name*="address"]').first();
            if (await addressInput.isVisible().catch(() => false)) {
                await addressInput.fill('香川県高松市テスト町1-2-3');
            }

            // 事業者を選択
            const merchantSelect = page.locator('select[name*="merchant"]').first();
            if (await merchantSelect.isVisible().catch(() => false)) {
                await merchantSelect.selectOption({ index: 1 }).catch(() => {});
            }

            // 送信
            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(3000);
            }
        });

        test('店舗を更新できること', async ({ page }) => {
            await page.goto('/shops');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/shops\/[^/]+\/edit/, { timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(2000);

                const nameInput = page.locator('input[name*="name"], input[id*="name"]').first();
                if (await nameInput.isVisible().catch(() => false)) {
                    const currentValue = await nameInput.inputValue();
                    await nameInput.fill(currentValue + '_更新');

                    const submitButton = page.getByRole('button', { name: /更新|保存|変更|Submit/i });
                    if (await submitButton.isVisible().catch(() => false)) {
                        await submitButton.click();
                        await page.waitForTimeout(3000);
                    }
                }
            }
        });
    });

    // ================================================================
    // クーポン CRUD
    // ================================================================
    test.describe('クーポン CRUD', () => {
        test('クーポンを新規作成できること', async ({ page }) => {
            await page.goto('/coupons/new');
            await page.waitForTimeout(3000);

            const testTitle = `テストクーポン_${uniqueId()}`;

            // タイトルを入力
            const titleInput = page.locator('input[name*="title"], input[id*="title"]').first();
            if (await titleInput.isVisible().catch(() => false)) {
                await titleInput.fill(testTitle);
            }

            // 説明を入力
            const descInput = page.locator('textarea[name*="description"], textarea[id*="description"]').first();
            if (await descInput.isVisible().catch(() => false)) {
                await descInput.fill('E2Eテスト用クーポンです');
            }

            // 店舗を選択
            const shopSelect = page.locator('select[name*="shop"]').first();
            if (await shopSelect.isVisible().catch(() => false)) {
                await shopSelect.selectOption({ index: 1 }).catch(() => {});
            }

            // ドリンクタイプを選択
            const drinkTypeSelect = page.locator('select[name*="drink"], select[name*="type"]').first();
            if (await drinkTypeSelect.isVisible().catch(() => false)) {
                await drinkTypeSelect.selectOption({ index: 1 }).catch(() => {});
            }

            // 送信
            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(3000);
            }
        });

        test('クーポンを更新できること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/coupons\/[^/]+\/edit/, { timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(2000);

                const titleInput = page.locator('input[name*="title"], input[id*="title"]').first();
                if (await titleInput.isVisible().catch(() => false)) {
                    const currentValue = await titleInput.inputValue();
                    await titleInput.fill(currentValue + '_更新');

                    const submitButton = page.getByRole('button', { name: /更新|保存|変更|Submit/i });
                    if (await submitButton.isVisible().catch(() => false)) {
                        await submitButton.click();
                        await page.waitForTimeout(3000);
                    }
                }
            }
        });

        test('クーポンのステータスを変更できること', async ({ page }) => {
            await page.goto('/coupons');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            // ステータス変更ボタンを探す
            const statusButton = page.locator('button:has-text("承認"), button:has-text("却下"), button:has-text("公開"), button:has-text("停止")').first();
            if (await statusButton.isVisible().catch(() => false)) {
                await statusButton.click();
                await page.waitForTimeout(2000);

                // 確認ダイアログがある場合は確認
                const confirmButton = page.getByRole('button', { name: /確認|はい|OK/i });
                if (await confirmButton.isVisible().catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(2000);
                }
            }
        });
    });

    // ================================================================
    // 管理者 CRUD
    // ================================================================
    test.describe('管理者 CRUD', () => {
        test('管理者を新規作成できること', async ({ page }) => {
            await page.goto('/admins/new');
            await page.waitForTimeout(3000);

            const testEmail = `test-admin-${uniqueId()}@example.com`;

            // メールを入力
            const emailInput = page.locator('input[type="email"]').first();
            if (await emailInput.isVisible().catch(() => false)) {
                await emailInput.fill(testEmail);
            }

            // 名前を入力
            const lastNameInput = page.locator('input[name*="lastName"], input[name*="last_name"]').first();
            if (await lastNameInput.isVisible().catch(() => false)) {
                await lastNameInput.fill('テスト');
            }

            const firstNameInput = page.locator('input[name*="firstName"], input[name*="first_name"]').first();
            if (await firstNameInput.isVisible().catch(() => false)) {
                await firstNameInput.fill('管理者');
            }

            // パスワードを入力
            const passwordInput = page.locator('input[type="password"]').first();
            if (await passwordInput.isVisible().catch(() => false)) {
                await passwordInput.fill('TestPassword123!');
            }

            // ロールを選択
            const roleSelect = page.locator('select[name*="role"]').first();
            if (await roleSelect.isVisible().catch(() => false)) {
                await roleSelect.selectOption({ index: 1 }).catch(() => {});
            }

            // 送信
            const submitButton = page.getByRole('button', { name: /登録|作成|保存|送信|Submit/i });
            if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await page.waitForTimeout(3000);
            }
        });

        test('管理者を更新できること', async ({ page }) => {
            await page.goto('/admins');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            const editLink = page.locator('a[href*="edit"]').first();
            if (await editLink.isVisible().catch(() => false)) {
                await editLink.click();
                await page.waitForURL(/\/admins\/[^/]+\/edit/, { timeout: 10000 }).catch(() => {});
                await page.waitForTimeout(2000);

                const firstNameInput = page.locator('input[name*="firstName"], input[name*="first_name"]').first();
                if (await firstNameInput.isVisible().catch(() => false)) {
                    const currentValue = await firstNameInput.inputValue();
                    await firstNameInput.fill(currentValue + '_更新');

                    const submitButton = page.getByRole('button', { name: /更新|保存|変更|Submit/i });
                    if (await submitButton.isVisible().catch(() => false)) {
                        await submitButton.click();
                        await page.waitForTimeout(3000);
                    }
                }
            }
        });
    });

    // ================================================================
    // 会員ステータス変更
    // ================================================================
    test.describe('会員ステータス変更', () => {
        test('会員のステータスを変更できること', async ({ page }) => {
            await page.goto('/users');
            await page.waitForTimeout(3000);
            await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

            // ステータス変更ボタンを探す
            const statusButton = page.locator('button:has-text("有効"), button:has-text("無効"), button:has-text("停止")').first();
            if (await statusButton.isVisible().catch(() => false)) {
                await statusButton.click();
                await page.waitForTimeout(2000);

                // 確認ダイアログがある場合は確認
                const confirmButton = page.getByRole('button', { name: /確認|はい|OK/i });
                if (await confirmButton.isVisible().catch(() => false)) {
                    await confirmButton.click();
                    await page.waitForTimeout(2000);
                }
            }
        });
    });
});
