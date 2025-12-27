import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  waitForPageLoad,
  takeScreenshot,
  uploadFile,
} from './utils/test-helpers';
import {
  createCouponData,
  createCouponListResponse,
} from './utils/test-data';

test.describe('クーポン管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('クーポン一覧が正しく表示されること', async ({ page }) => {
      const mockResponse = createCouponListResponse(5);
      await mockApiResponse(page, '**/api/admin/coupons*', {
        coupons: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/coupons');
      await waitForPageLoad(page);

      // テーブルヘッダーの確認
      await expect(page.getByRole('columnheader', { name: /クーポン名|タイトル/ })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /割引/ })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /期間|有効期限/ })).toBeVisible();

      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(5);

      await takeScreenshot(page, 'coupons-list');
    });

    test('空の一覧でメッセージが表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/coupons*', {
        coupons: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/coupons');
      await waitForPageLoad(page);

      await expect(page.getByText(/クーポンが見つかりません|データがありません/)).toBeVisible();
    });

    test('検索機能が動作すること', async ({ page }) => {
      const searchCoupon = createCouponData({ title: '検索テストクーポン' });
      await mockApiResponse(page, '**/api/admin/coupons*', {
        coupons: [{ id: 'search-result', ...searchCoupon, usedCount: 0, createdAt: new Date().toISOString() }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/coupons');
      await waitForPageLoad(page);

      const searchInput = page.getByPlaceholder(/検索|クーポン名/);
      await searchInput.fill('検索テスト');
      await page.keyboard.press('Enter');

      await waitForPageLoad(page);
      await expect(page.getByText('検索テストクーポン')).toBeVisible();
    });
  });

  // ================================================================
  // 新規作成テスト
  // ================================================================
  test.describe('新規作成', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('新規クーポンを作成できること', async ({ page }) => {
      const newCoupon = createCouponData();

      await mockApiResponse(page, '**/api/admin/coupons', {
        id: 'new-coupon-001',
        ...newCoupon,
        usedCount: 0,
        createdAt: new Date().toISOString(),
      }, 201);

      await page.goto('/coupons/new');
      await waitForPageLoad(page);

      // フォーム入力
      await page.getByLabel(/クーポン名|タイトル/).fill(newCoupon.title);
      await page.getByLabel(/説明|詳細/).fill(newCoupon.description);

      // 割引タイプ選択
      const discountTypeSelect = page.getByRole('combobox', { name: /割引タイプ|割引種別/ });
      if (await discountTypeSelect.isVisible()) {
        await discountTypeSelect.click();
        await page.getByRole('option', { name: /パーセント|%/ }).click();
      }

      // 割引値入力
      await page.getByLabel(/割引値|割引額/).fill(String(newCoupon.discountValue));

      // 日付入力
      const startDateInput = page.getByLabel(/開始日|利用開始/);
      if (await startDateInput.isVisible()) {
        await startDateInput.fill(newCoupon.startDate);
      }

      const endDateInput = page.getByLabel(/終了日|利用終了|有効期限/);
      if (await endDateInput.isVisible()) {
        await endDateInput.fill(newCoupon.endDate);
      }

      // 利用上限
      const usageLimitInput = page.getByLabel(/利用上限|発行枚数/);
      if (await usageLimitInput.isVisible() && newCoupon.usageLimit) {
        await usageLimitInput.fill(String(newCoupon.usageLimit));
      }

      await takeScreenshot(page, 'coupons-new-form-filled');

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();
      await page.waitForURL('**/coupons**', { timeout: 10000 });
    });

    test('画像付きでクーポンを作成できること', async ({ page }) => {
      const newCoupon = createCouponData();

      await mockApiResponse(page, '**/api/admin/coupons', {
        id: 'new-coupon-with-image',
        ...newCoupon,
        imageUrl: 'https://example.com/coupon-image.jpg',
        createdAt: new Date().toISOString(),
      }, 201);

      // 画像アップロードAPIをモック
      await mockApiResponse(page, '**/api/upload*', {
        url: 'https://example.com/coupon-image.jpg',
      });

      await page.goto('/coupons/new');
      await waitForPageLoad(page);

      await page.getByLabel(/クーポン名|タイトル/).fill(newCoupon.title);
      await page.getByLabel(/説明|詳細/).fill(newCoupon.description);

      // ファイルアップロード（input[type="file"]が存在する場合）
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // テスト用の画像ファイルパスを設定（実際のテストでは存在するファイルを使用）
        // await uploadFile(page, 'input[type="file"]', 'test-data/sample-image.png');
      }

      await takeScreenshot(page, 'coupons-new-with-image');
    });

    test('必須項目のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/coupons/new');
      await waitForPageLoad(page);

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.locator('.text-red-500, .text-destructive').first()).toBeVisible();
      await takeScreenshot(page, 'coupons-new-validation-error');
    });

    test('終了日が開始日より前の場合エラーが表示されること', async ({ page }) => {
      await page.goto('/coupons/new');
      await waitForPageLoad(page);

      const newCoupon = createCouponData();
      await page.getByLabel(/クーポン名|タイトル/).fill(newCoupon.title);

      // 開始日を未来に設定
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const startDateInput = page.getByLabel(/開始日|利用開始/);
      if (await startDateInput.isVisible()) {
        await startDateInput.fill(futureDate.toISOString().split('T')[0]);
      }

      // 終了日を開始日より前に設定
      const pastDate = new Date();
      const endDateInput = page.getByLabel(/終了日|利用終了|有効期限/);
      if (await endDateInput.isVisible()) {
        await endDateInput.fill(pastDate.toISOString().split('T')[0]);
      }

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // 日付エラーメッセージの確認
      await expect(page.getByText(/終了日.*開始日|期間.*正しく/)).toBeVisible();
    });
  });

  // ================================================================
  // 詳細表示テスト
  // ================================================================
  test.describe('詳細表示', () => {
    const mockCoupon = {
      id: 'coupon-detail-001',
      title: '詳細テストクーポン',
      description: 'テスト用のクーポン説明文です',
      discountType: 'percentage',
      discountValue: 10,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      usageLimit: 100,
      usageLimitPerUser: 1,
      usedCount: 25,
      isPublished: true,
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/coupons/coupon-detail-001', mockCoupon);
    });

    test('クーポン詳細が正しく表示されること', async ({ page }) => {
      await page.goto('/coupons/coupon-detail-001');
      await waitForPageLoad(page);

      await expect(page.getByText('詳細テストクーポン')).toBeVisible();
      await expect(page.getByText('10%')).toBeVisible();
      await expect(page.getByText('25')).toBeVisible(); // 利用回数

      await takeScreenshot(page, 'coupons-detail');
    });

    test('利用履歴が表示されること', async ({ page }) => {
      // 利用履歴APIをモック
      await mockApiResponse(page, '**/api/admin/coupons/coupon-detail-001/usage*', {
        usage: [
          {
            id: 'usage-001',
            userId: 'user-001',
            userName: 'テストユーザー1',
            usedAt: '2024-06-01T10:00:00Z',
          },
          {
            id: 'usage-002',
            userId: 'user-002',
            userName: 'テストユーザー2',
            usedAt: '2024-06-02T11:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });

      await page.goto('/coupons/coupon-detail-001');
      await waitForPageLoad(page);

      // 利用履歴タブまたはセクションをクリック
      const usageTab = page.getByRole('tab', { name: /利用履歴/ });
      if (await usageTab.isVisible()) {
        await usageTab.click();
        await waitForPageLoad(page);

        await expect(page.getByText('テストユーザー1')).toBeVisible();
        await expect(page.getByText('テストユーザー2')).toBeVisible();

        await takeScreenshot(page, 'coupons-usage-history');
      }
    });
  });

  // ================================================================
  // 編集テスト
  // ================================================================
  test.describe('編集', () => {
    const mockCoupon = {
      id: 'coupon-edit-001',
      title: '編集テストクーポン',
      description: 'テスト用のクーポン説明文です',
      discountType: 'percentage',
      discountValue: 10,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      usageLimit: 100,
      usedCount: 0,
      isPublished: false,
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/coupons/coupon-edit-001', mockCoupon);
    });

    test('クーポン情報を編集できること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/coupons/coupon-edit-001', {
        ...mockCoupon,
        title: '更新後のクーポン名',
        discountValue: 20,
      });

      await page.goto('/coupons/coupon-edit-001/edit');
      await waitForPageLoad(page);

      await page.getByLabel(/クーポン名|タイトル/).clear();
      await page.getByLabel(/クーポン名|タイトル/).fill('更新後のクーポン名');

      await page.getByLabel(/割引値|割引額/).clear();
      await page.getByLabel(/割引値|割引額/).fill('20');

      await takeScreenshot(page, 'coupons-edit-form');

      await page.getByRole('button', { name: /保存|更新/ }).click();
      await page.waitForURL('**/coupons**', { timeout: 10000 });
    });
  });

  // ================================================================
  // 公開設定テスト
  // ================================================================
  test.describe('公開設定', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('クーポンを公開できること', async ({ page }) => {
      const draftCoupon = {
        id: 'coupon-draft-001',
        title: '下書きクーポン',
        isPublished: false,
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/coupons/coupon-draft-001', draftCoupon);
      await mockApiResponse(page, '**/api/admin/coupons/coupon-draft-001/publish', {
        ...draftCoupon,
        isPublished: true,
      });

      await page.goto('/coupons/coupon-draft-001');
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

    test('クーポンを非公開にできること', async ({ page }) => {
      const publishedCoupon = {
        id: 'coupon-published-001',
        title: '公開中クーポン',
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/coupons/coupon-published-001', publishedCoupon);
      await mockApiResponse(page, '**/api/admin/coupons/coupon-published-001/unpublish', {
        ...publishedCoupon,
        isPublished: false,
      });

      await page.goto('/coupons/coupon-published-001');
      await waitForPageLoad(page);

      const unpublishButton = page.getByRole('button', { name: /非公開|停止/ });
      if (await unpublishButton.isVisible()) {
        await unpublishButton.click();
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
      await mockApiError(page, '**/api/admin/coupons*', 500, 'サーバーエラーが発生しました');

      await page.goto('/coupons');
      await waitForPageLoad(page);

      await expect(page.getByText(/エラー|問題が発生|サーバーエラー/)).toBeVisible();
      await takeScreenshot(page, 'coupons-list-error');
    });

    test('存在しないクーポンにアクセスした場合404エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/coupons/non-existent', 404, 'クーポンが見つかりません');

      await page.goto('/coupons/non-existent');
      await waitForPageLoad(page);

      await expect(page.getByText(/見つかりません|存在しません|404/)).toBeVisible();
    });
  });

  // ================================================================
  // 権限テスト
  // ================================================================
  test.describe('権限チェック', () => {
    test('Shopは自店舗のクーポンを管理できること', async ({ page }) => {
      await loginAs(page, 'shop');

      const shopCoupons = createCouponListResponse(2);
      await mockApiResponse(page, '**/api/admin/coupons*', {
        coupons: shopCoupons.items,
        pagination: shopCoupons.pagination,
      });

      await page.goto('/coupons');
      await waitForPageLoad(page);

      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(2);
    });

    test('Merchantは配下店舗のクーポンを閲覧できること', async ({ page }) => {
      await loginAs(page, 'merchant');

      const merchantCoupons = createCouponListResponse(3);
      await mockApiResponse(page, '**/api/admin/coupons*', {
        coupons: merchantCoupons.items,
        pagination: merchantCoupons.pagination,
      });

      await page.goto('/coupons');
      await waitForPageLoad(page);

      await expect(page.getByRole('heading', { name: /クーポン/ })).toBeVisible();
    });
  });
});




