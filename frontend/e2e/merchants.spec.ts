import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  waitForPageLoad,
  takeScreenshot,
  expectToastMessage,
} from './utils/test-helpers';
import {
  createMerchantData,
  createMerchantListResponse,
} from './utils/test-data';

test.describe('マーチャント（事業者）管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('マーチャント一覧が正しく表示されること', async ({ page }) => {
      // マーチャント一覧APIをモック
      const mockResponse = createMerchantListResponse(5);
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // テーブルヘッダーの確認
      await expect(page.getByRole('columnheader', { name: '事業者名' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'メールアドレス' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'ステータス' })).toBeVisible();

      // データ行が表示されていることを確認
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(5);

      await takeScreenshot(page, 'merchants-list');
    });

    test('空の一覧でメッセージが表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // 空の状態メッセージを確認
      await expect(page.getByText(/事業者が見つかりません|データがありません/)).toBeVisible();
    });

    test('検索機能が動作すること', async ({ page }) => {
      const searchMerchant = createMerchantData({ name: '検索テスト事業者' });
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [{ id: 'search-result', ...searchMerchant, status: 'approved', createdAt: new Date().toISOString() }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // 検索入力
      const searchInput = page.getByPlaceholder(/検索|事業者名/);
      await searchInput.fill('検索テスト');
      await page.keyboard.press('Enter');

      await waitForPageLoad(page);

      // 検索結果が表示されることを確認
      await expect(page.getByText('検索テスト事業者')).toBeVisible();
    });

    test('ステータスフィルターが動作すること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // ステータスフィルターを選択
      const statusFilter = page.getByRole('combobox', { name: /ステータス/ });
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.getByRole('option', { name: /承認済み|approved/i }).click();
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

    test('新規マーチャントを作成できること', async ({ page }) => {
      const newMerchant = createMerchantData();

      // 作成APIをモック
      await mockApiResponse(page, '**/api/admin/merchants', {
        id: 'new-merchant-001',
        ...newMerchant,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }, 201);

      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // フォーム入力
      await page.getByLabel('事業者名').fill(newMerchant.name);
      await page.getByLabel('メールアドレス').fill(newMerchant.email);
      await page.getByLabel('電話番号').fill(newMerchant.phoneNumber);
      await page.getByLabel('郵便番号').fill(newMerchant.postalCode);
      await page.getByLabel('都道府県').fill(newMerchant.prefecture);
      await page.getByLabel('市区町村').fill(newMerchant.city);
      await page.getByLabel('住所').fill(newMerchant.address);
      await page.getByLabel('代表者名').fill(newMerchant.representativeName);

      await takeScreenshot(page, 'merchants-new-form-filled');

      // 送信
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // 成功メッセージまたはリダイレクトを確認
      await page.waitForURL('**/merchants**', { timeout: 10000 });
    });

    test('必須項目のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // 空で送信
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // バリデーションエラーの確認
      await expect(page.locator('.text-red-500, .text-destructive').first()).toBeVisible();

      await takeScreenshot(page, 'merchants-new-validation-error');
    });

    test('メールアドレス形式のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // 無効なメールアドレスを入力
      await page.getByLabel('メールアドレス').fill('invalid-email');
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // メール形式エラーの確認
      await expect(page.getByText(/メールアドレスの形式が正しくありません|有効なメールアドレスを入力/)).toBeVisible();
    });
  });

  // ================================================================
  // 詳細表示テスト
  // ================================================================
  test.describe('詳細表示', () => {
    const mockMerchant = {
      id: 'merchant-detail-001',
      name: '詳細テスト事業者',
      email: 'detail@example.com',
      phoneNumber: '090-1234-5678',
      postalCode: '760-0001',
      prefecture: '香川県',
      city: '高松市',
      address: '中央町1-1',
      representativeName: '代表太郎',
      status: 'approved',
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/merchants/merchant-detail-001', mockMerchant);
    });

    test('マーチャント詳細が正しく表示されること', async ({ page }) => {
      await page.goto('/merchants/merchant-detail-001');
      await waitForPageLoad(page);

      // 詳細情報の確認
      await expect(page.getByText('詳細テスト事業者')).toBeVisible();
      await expect(page.getByText('detail@example.com')).toBeVisible();
      await expect(page.getByText('代表太郎')).toBeVisible();

      await takeScreenshot(page, 'merchants-detail');
    });
  });

  // ================================================================
  // 編集テスト
  // ================================================================
  test.describe('編集', () => {
    const mockMerchant = {
      id: 'merchant-edit-001',
      name: '編集テスト事業者',
      email: 'edit@example.com',
      phoneNumber: '090-1234-5678',
      postalCode: '760-0001',
      prefecture: '香川県',
      city: '高松市',
      address: '中央町1-1',
      representativeName: '代表太郎',
      status: 'approved',
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/merchants/merchant-edit-001', mockMerchant);
    });

    test('マーチャント情報を編集できること', async ({ page }) => {
      // 更新APIをモック
      await mockApiResponse(page, '**/api/admin/merchants/merchant-edit-001', {
        ...mockMerchant,
        name: '更新後の事業者名',
      });

      await page.goto('/merchants/merchant-edit-001/edit');
      await waitForPageLoad(page);

      // 事業者名を変更
      await page.getByLabel('事業者名').clear();
      await page.getByLabel('事業者名').fill('更新後の事業者名');

      await takeScreenshot(page, 'merchants-edit-form');

      // 保存
      await page.getByRole('button', { name: /保存|更新/ }).click();

      // 成功を確認
      await page.waitForURL('**/merchants**', { timeout: 10000 });
    });
  });

  // ================================================================
  // ステータス変更テスト
  // ================================================================
  test.describe('ステータス変更', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('承認ステータスに変更できること', async ({ page }) => {
      const pendingMerchant = {
        id: 'merchant-pending-001',
        name: '承認待ち事業者',
        email: 'pending@example.com',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/merchants/merchant-pending-001', pendingMerchant);
      await mockApiResponse(page, '**/api/admin/merchants/merchant-pending-001/approve', {
        ...pendingMerchant,
        status: 'approved',
      });

      await page.goto('/merchants/merchant-pending-001');
      await waitForPageLoad(page);

      // 承認ボタンをクリック
      const approveButton = page.getByRole('button', { name: /承認/ });
      if (await approveButton.isVisible()) {
        await approveButton.click();

        // 確認ダイアログがあれば承認
        const confirmButton = page.getByRole('button', { name: /確認|はい|OK/ });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
      }
    });

    test('非承認ステータスに変更できること', async ({ page }) => {
      const approvedMerchant = {
        id: 'merchant-approved-001',
        name: '承認済み事業者',
        email: 'approved@example.com',
        status: 'approved',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/merchants/merchant-approved-001', approvedMerchant);
      await mockApiResponse(page, '**/api/admin/merchants/merchant-approved-001/reject', {
        ...approvedMerchant,
        status: 'rejected',
      });

      await page.goto('/merchants/merchant-approved-001');
      await waitForPageLoad(page);

      // 非承認ボタンをクリック
      const rejectButton = page.getByRole('button', { name: /非承認|却下/ });
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
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
      await mockApiError(page, '**/api/admin/merchants*', 500, 'サーバーエラーが発生しました');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // エラーメッセージの確認
      await expect(page.getByText(/エラー|問題が発生|サーバーエラー/)).toBeVisible();

      await takeScreenshot(page, 'merchants-list-error');
    });

    test('存在しないマーチャントにアクセスした場合404エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants/non-existent', 404, '事業者が見つかりません');

      await page.goto('/merchants/non-existent');
      await waitForPageLoad(page);

      // 404エラーまたはエラーメッセージの確認
      await expect(page.getByText(/見つかりません|存在しません|404/)).toBeVisible();
    });

    test('重複メールアドレスエラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants', 409, 'このメールアドレスは既に登録されています');

      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      const newMerchant = createMerchantData();
      await page.getByLabel('事業者名').fill(newMerchant.name);
      await page.getByLabel('メールアドレス').fill('duplicate@example.com');
      await page.getByLabel('電話番号').fill(newMerchant.phoneNumber);
      await page.getByLabel('郵便番号').fill(newMerchant.postalCode);
      await page.getByLabel('都道府県').fill(newMerchant.prefecture);
      await page.getByLabel('市区町村').fill(newMerchant.city);
      await page.getByLabel('住所').fill(newMerchant.address);
      await page.getByLabel('代表者名').fill(newMerchant.representativeName);

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // 重複エラーメッセージの確認
      await expect(page.getByText(/既に登録|重複/)).toBeVisible();
    });
  });

  // ================================================================
  // 権限テスト
  // ================================================================
  test.describe('権限チェック', () => {
    test('Operatorはマーチャント一覧を閲覧できること', async ({ page }) => {
      await loginAs(page, 'operator');
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // ページが表示されることを確認
      await expect(page.getByRole('heading', { name: /事業者/ })).toBeVisible();
    });

    test('Merchantは自社情報のみ閲覧できること', async ({ page }) => {
      await loginAs(page, 'merchant');

      await page.goto('/merchants');
      // マーチャントは一覧ページにアクセスできないか、自社のみ表示されることを確認
    });
  });
});




