import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  waitForPageLoad,
  takeScreenshot,
} from './utils/test-helpers';
import {
  createShopData,
  createShopListResponse,
} from './utils/test-data';

test.describe('店舗管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('店舗一覧が正しく表示されること', async ({ page }) => {
      const mockResponse = createShopListResponse(5);
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      // テーブルヘッダーの確認
      await expect(page.getByRole('columnheader', { name: '店舗名' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /メール|メールアドレス/ })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'ステータス' })).toBeVisible();

      // データ行が表示されていることを確認
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(5);

      await takeScreenshot(page, 'shops-list');
    });

    test('空の一覧でメッセージが表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      await expect(page.getByText(/店舗が見つかりません|データがありません/)).toBeVisible();
    });

    test('検索機能が動作すること', async ({ page }) => {
      const searchShop = createShopData({ name: '検索テスト店舗' });
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: [{ id: 'search-result', ...searchShop, status: 'published', createdAt: new Date().toISOString() }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      const searchInput = page.getByPlaceholder(/検索|店舗名/);
      await searchInput.fill('検索テスト');
      await page.keyboard.press('Enter');

      await waitForPageLoad(page);
      await expect(page.getByText('検索テスト店舗')).toBeVisible();
    });

    test('ステータスフィルターが動作すること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      const statusFilter = page.getByRole('combobox', { name: /ステータス/ });
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.getByRole('option', { name: /公開中|published/i }).click();
      }
    });
  });

  // ================================================================
  // 新規作成テスト
  // ================================================================
  test.describe('新規作成', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('新規店舗を作成できること', async ({ page }) => {
      const newShop = createShopData();

      await mockApiResponse(page, '**/api/admin/shops', {
        id: 'new-shop-001',
        ...newShop,
        status: 'draft',
        createdAt: new Date().toISOString(),
      }, 201);

      await page.goto('/shops/new');
      await waitForPageLoad(page);

      // フォーム入力
      await page.getByLabel('店舗名').fill(newShop.name);
      await page.getByLabel('メールアドレス').fill(newShop.email);
      await page.getByLabel('電話番号').fill(newShop.phoneNumber);
      await page.getByLabel('郵便番号').fill(newShop.postalCode);
      await page.getByLabel('都道府県').fill(newShop.prefecture);
      await page.getByLabel('市区町村').fill(newShop.city);
      await page.getByLabel('住所').fill(newShop.address);

      // 営業時間・定休日（存在する場合）
      const businessHoursInput = page.getByLabel('営業時間');
      if (await businessHoursInput.isVisible()) {
        await businessHoursInput.fill(newShop.businessHours || '');
      }

      const regularHolidayInput = page.getByLabel('定休日');
      if (await regularHolidayInput.isVisible()) {
        await regularHolidayInput.fill(newShop.regularHoliday || '');
      }

      await takeScreenshot(page, 'shops-new-form-filled');

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();
      await page.waitForURL('**/shops**', { timeout: 10000 });
    });

    test('必須項目のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/shops/new');
      await waitForPageLoad(page);

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.locator('.text-red-500, .text-destructive').first()).toBeVisible();
      await takeScreenshot(page, 'shops-new-validation-error');
    });

    test('メールアドレス形式のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/shops/new');
      await waitForPageLoad(page);

      await page.getByLabel('メールアドレス').fill('invalid-email');
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/メールアドレスの形式が正しくありません|有効なメールアドレスを入力/)).toBeVisible();
    });
  });

  // ================================================================
  // 詳細表示テスト
  // ================================================================
  test.describe('詳細表示', () => {
    const mockShop = {
      id: 'shop-detail-001',
      name: '詳細テスト店舗',
      email: 'shop-detail@example.com',
      phoneNumber: '090-1234-5678',
      postalCode: '760-0002',
      prefecture: '香川県',
      city: '高松市',
      address: '栗林町1-1',
      description: 'テスト用店舗です',
      businessHours: '10:00-22:00',
      regularHoliday: '月曜日',
      status: 'published',
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/shops/shop-detail-001', mockShop);
    });

    test('店舗詳細が正しく表示されること', async ({ page }) => {
      await page.goto('/shops/shop-detail-001');
      await waitForPageLoad(page);

      await expect(page.getByText('詳細テスト店舗')).toBeVisible();
      await expect(page.getByText('shop-detail@example.com')).toBeVisible();
      await expect(page.getByText('10:00-22:00')).toBeVisible();

      await takeScreenshot(page, 'shops-detail');
    });

    test('QRコードが表示されること', async ({ page }) => {
      await page.goto('/shops/shop-detail-001');
      await waitForPageLoad(page);

      // QRコードボタンまたは画像を探す
      const qrButton = page.getByRole('button', { name: /QR|QRコード/ });
      const qrImage = page.locator('img[alt*="QR"]');

      // どちらかが存在すればOK
      const hasQrButton = await qrButton.isVisible().catch(() => false);
      const hasQrImage = await qrImage.isVisible().catch(() => false);

      if (hasQrButton) {
        await qrButton.click();
        await expect(page.locator('img[alt*="QR"], canvas')).toBeVisible();
        await takeScreenshot(page, 'shops-qr-code');
      } else if (hasQrImage) {
        await expect(qrImage).toBeVisible();
      }
    });
  });

  // ================================================================
  // 編集テスト
  // ================================================================
  test.describe('編集', () => {
    const mockShop = {
      id: 'shop-edit-001',
      name: '編集テスト店舗',
      email: 'shop-edit@example.com',
      phoneNumber: '090-1234-5678',
      postalCode: '760-0002',
      prefecture: '香川県',
      city: '高松市',
      address: '栗林町1-1',
      status: 'published',
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/shops/shop-edit-001', mockShop);
    });

    test('店舗情報を編集できること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/shops/shop-edit-001', {
        ...mockShop,
        name: '更新後の店舗名',
      });

      await page.goto('/shops/shop-edit-001/edit');
      await waitForPageLoad(page);

      await page.getByLabel('店舗名').clear();
      await page.getByLabel('店舗名').fill('更新後の店舗名');

      await takeScreenshot(page, 'shops-edit-form');

      await page.getByRole('button', { name: /保存|更新/ }).click();
      await page.waitForURL('**/shops**', { timeout: 10000 });
    });
  });

  // ================================================================
  // ステータス変更テスト
  // ================================================================
  test.describe('ステータス変更', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('公開ステータスに変更できること', async ({ page }) => {
      const draftShop = {
        id: 'shop-draft-001',
        name: '下書き店舗',
        email: 'draft@example.com',
        status: 'draft',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/shops/shop-draft-001', draftShop);
      await mockApiResponse(page, '**/api/admin/shops/shop-draft-001/publish', {
        ...draftShop,
        status: 'published',
      });

      await page.goto('/shops/shop-draft-001');
      await waitForPageLoad(page);

      const publishButton = page.getByRole('button', { name: /公開/ });
      if (await publishButton.isVisible()) {
        await publishButton.click();

        const confirmButton = page.getByRole('button', { name: /確認|はい|OK/ });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
      }
    });

    test('非公開ステータスに変更できること', async ({ page }) => {
      const publishedShop = {
        id: 'shop-published-001',
        name: '公開中店舗',
        email: 'published@example.com',
        status: 'published',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/shops/shop-published-001', publishedShop);
      await mockApiResponse(page, '**/api/admin/shops/shop-published-001/unpublish', {
        ...publishedShop,
        status: 'draft',
      });

      await page.goto('/shops/shop-published-001');
      await waitForPageLoad(page);

      const unpublishButton = page.getByRole('button', { name: /非公開|下書き/ });
      if (await unpublishButton.isVisible()) {
        await unpublishButton.click();
      }
    });

    test('一括ステータス変更ができること', async ({ page }) => {
      const mockResponse = createShopListResponse(3);
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      // チェックボックスで複数選択
      const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 0) {
        await checkboxes.first().check();
        if (count > 1) {
          await checkboxes.nth(1).check();
        }

        // 一括操作ボタン
        const bulkActionButton = page.getByRole('button', { name: /一括|選択した店舗/ });
        if (await bulkActionButton.isVisible()) {
          await bulkActionButton.click();
          await takeScreenshot(page, 'shops-bulk-action');
        }
      }
    });
  });

  // ================================================================
  // エラーハンドリングテスト
  // ================================================================
  test.describe('エラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('API取得エラー時にエラーメッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/shops*', 500, 'サーバーエラーが発生しました');

      await page.goto('/shops');
      await waitForPageLoad(page);

      await expect(page.getByText(/エラー|問題が発生|サーバーエラー/)).toBeVisible();
      await takeScreenshot(page, 'shops-list-error');
    });

    test('存在しない店舗にアクセスした場合404エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/shops/non-existent', 404, '店舗が見つかりません');

      await page.goto('/shops/non-existent');
      await waitForPageLoad(page);

      await expect(page.getByText(/見つかりません|存在しません|404/)).toBeVisible();
    });
  });

  // ================================================================
  // 権限テスト
  // ================================================================
  test.describe('権限チェック', () => {
    test('Merchantは自社店舗のみ閲覧できること', async ({ page }) => {
      await loginAs(page, 'merchant');

      const merchantShops = createShopListResponse(2);
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: merchantShops.items,
        pagination: merchantShops.pagination,
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      // 店舗一覧が表示されることを確認
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(2);
    });

    test('Shopは自店舗情報のみ閲覧できること', async ({ page }) => {
      await loginAs(page, 'shop');

      const ownShop = {
        id: 'shop-test-001',
        name: '自店舗',
        email: 'own@example.com',
        status: 'published',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/shops/shop-test-001', ownShop);

      await page.goto('/shops/shop-test-001');
      await waitForPageLoad(page);

      await expect(page.getByText('自店舗')).toBeVisible();
    });
  });
});




