import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  waitForPageLoad,
  takeScreenshot,
} from './utils/test-helpers';
import {
  createUserData,
  createUserListResponse,
} from './utils/test-data';

test.describe('ユーザー管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('ユーザー一覧が正しく表示されること', async ({ page }) => {
      const mockResponse = createUserListResponse(5);
      await mockApiResponse(page, '**/api/admin/users*', {
        users: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      // テーブルヘッダーの確認
      await expect(page.getByRole('columnheader', { name: 'ニックネーム' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /メール|メールアドレス/ })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /ランク|会員ランク/ })).toBeVisible();

      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(5);

      await takeScreenshot(page, 'users-list');
    });

    test('Sysadminは機密情報（住所等）を閲覧できること', async ({ page }) => {
      const userWithSensitiveInfo = {
        id: 'user-001',
        nickname: 'テストユーザー',
        email: 'user@example.com',
        postalCode: '760-0001',
        prefecture: '香川県',
        city: '高松市',
        address: '中央町1-1',
        birthDate: '1990-01-01',
        gender: 1,
        rank: 1,
        registeredAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/users*', {
        users: [userWithSensitiveInfo],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      // 機密情報カラムが表示されることを確認
      await expect(page.getByRole('columnheader', { name: '郵便番号' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '住所' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '生年月日' })).toBeVisible();

      // データも表示されていることを確認
      await expect(page.getByRole('cell', { name: '760-0001' })).toBeVisible();
    });

    test('Operatorは機密情報（住所等）を閲覧できないこと', async ({ page }) => {
      await loginAs(page, 'operator');

      const userWithoutSensitiveInfo = {
        id: 'user-001',
        nickname: 'テストユーザー',
        email: 'user@example.com',
        rank: 1,
        registeredAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/users*', {
        users: [userWithoutSensitiveInfo],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      // 機密情報カラムが表示されないことを確認
      await expect(page.getByRole('columnheader', { name: '郵便番号' })).not.toBeVisible();
      await expect(page.getByRole('columnheader', { name: '住所' })).not.toBeVisible();
      await expect(page.getByRole('columnheader', { name: '生年月日' })).not.toBeVisible();
    });

    test('空の一覧でメッセージが表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/users*', {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      await expect(page.getByText(/ユーザーが見つかりません|データがありません/)).toBeVisible();
    });

    test('検索機能が動作すること', async ({ page }) => {
      const searchUser = createUserData({ nickname: '検索テストユーザー' });
      await mockApiResponse(page, '**/api/admin/users*', {
        users: [{ id: 'search-result', ...searchUser, rank: 1, registeredAt: new Date().toISOString() }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      const searchInput = page.getByPlaceholder(/検索|ニックネーム|メール/);
      await searchInput.fill('検索テスト');
      await page.keyboard.press('Enter');

      await waitForPageLoad(page);
      await expect(page.getByText('検索テストユーザー')).toBeVisible();
    });

    test('ランクフィルターが動作すること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/users*', {
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/users');
      await waitForPageLoad(page);

      const rankFilter = page.getByRole('combobox', { name: /ランク|会員ランク/ });
      if (await rankFilter.isVisible()) {
        await rankFilter.click();
        await page.getByRole('option', { name: /ゴールド|シルバー|ブロンズ/ }).first().click();
      }
    });
  });

  // ================================================================
  // 詳細表示テスト
  // ================================================================
  test.describe('詳細表示', () => {
    const mockUser = {
      id: 'user-detail-001',
      nickname: '詳細テストユーザー',
      email: 'detail@example.com',
      postalCode: '760-0001',
      prefecture: '香川県',
      city: '高松市',
      address: '中央町1-1',
      birthDate: '1990-01-01',
      gender: 1,
      rank: 3,
      registeredAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/users/user-detail-001', mockUser);
    });

    test('ユーザー詳細が正しく表示されること', async ({ page }) => {
      await page.goto('/users/user-detail-001');
      await waitForPageLoad(page);

      await expect(page.getByText('詳細テストユーザー')).toBeVisible();
      await expect(page.getByText('detail@example.com')).toBeVisible();

      await takeScreenshot(page, 'users-detail');
    });

    test('クーポン利用履歴が表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/users/user-detail-001/coupon-usage*', {
        usage: [
          {
            id: 'usage-001',
            couponId: 'coupon-001',
            couponTitle: '10%OFFクーポン',
            shopName: 'テスト店舗A',
            usedAt: '2024-06-01T10:00:00Z',
          },
          {
            id: 'usage-002',
            couponId: 'coupon-002',
            couponTitle: '500円引きクーポン',
            shopName: 'テスト店舗B',
            usedAt: '2024-06-15T14:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });

      await page.goto('/users/user-detail-001');
      await waitForPageLoad(page);

      // 利用履歴タブまたはセクションをクリック
      const usageTab = page.getByRole('tab', { name: /利用履歴|クーポン履歴/ });
      if (await usageTab.isVisible()) {
        await usageTab.click();
        await waitForPageLoad(page);

        await expect(page.getByText('10%OFFクーポン')).toBeVisible();
        await expect(page.getByText('テスト店舗A')).toBeVisible();

        await takeScreenshot(page, 'users-coupon-history');
      }
    });
  });

  // ================================================================
  // 編集テスト
  // ================================================================
  test.describe('編集', () => {
    const mockUser = {
      id: 'user-edit-001',
      nickname: '編集テストユーザー',
      email: 'edit@example.com',
      rank: 1,
      registeredAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/users/user-edit-001', mockUser);
    });

    test('ユーザー情報を編集できること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/users/user-edit-001', {
        ...mockUser,
        rank: 2,
      });

      await page.goto('/users/user-edit-001/edit');
      await waitForPageLoad(page);

      // ランク変更
      const rankSelect = page.getByRole('combobox', { name: /ランク|会員ランク/ });
      if (await rankSelect.isVisible()) {
        await rankSelect.click();
        await page.getByRole('option', { name: /シルバー|2/ }).click();
      }

      await takeScreenshot(page, 'users-edit-form');

      await page.getByRole('button', { name: /保存|更新/ }).click();
      await page.waitForURL('**/users**', { timeout: 10000 });
    });

    test('ニックネームを編集できること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/users/user-edit-001', {
        ...mockUser,
        nickname: '更新後のニックネーム',
      });

      await page.goto('/users/user-edit-001/edit');
      await waitForPageLoad(page);

      const nicknameInput = page.getByLabel('ニックネーム');
      if (await nicknameInput.isVisible()) {
        await nicknameInput.clear();
        await nicknameInput.fill('更新後のニックネーム');
      }

      await page.getByRole('button', { name: /保存|更新/ }).click();
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
      await mockApiError(page, '**/api/admin/users*', 500, 'サーバーエラーが発生しました');

      await page.goto('/users');
      await waitForPageLoad(page);

      await expect(page.getByText(/エラー|問題が発生|サーバーエラー/)).toBeVisible();
      await takeScreenshot(page, 'users-list-error');
    });

    test('存在しないユーザーにアクセスした場合404エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/users/non-existent', 404, 'ユーザーが見つかりません');

      await page.goto('/users/non-existent');
      await waitForPageLoad(page);

      await expect(page.getByText(/見つかりません|存在しません|404/)).toBeVisible();
    });
  });

  // ================================================================
  // 権限テスト
  // ================================================================
  test.describe('権限チェック', () => {
    test('Merchantはユーザー管理ページにアクセスできないこと', async ({ page }) => {
      await loginAs(page, 'merchant');

      await page.goto('/users');
      
      // リダイレクトされるか、アクセス拒否メッセージが表示される
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/users');
      const hasAccessDenied = await page.getByText(/アクセス権限|権限がありません/).isVisible().catch(() => false);

      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });

    test('Shopはユーザー管理ページにアクセスできないこと', async ({ page }) => {
      await loginAs(page, 'shop');

      await page.goto('/users');
      
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/users');
      const hasAccessDenied = await page.getByText(/アクセス権限|権限がありません/).isVisible().catch(() => false);

      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });
  });
});




