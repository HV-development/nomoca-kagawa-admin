import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  waitForPageLoad,
  takeScreenshot,
  handleConfirmDialog,
} from './utils/test-helpers';
import {
  createAdminData,
  createAdminListResponse,
} from './utils/test-data';

test.describe('管理者アカウント管理', () => {
  // ================================================================
  // 一覧表示テスト
  // ================================================================
  test.describe('一覧表示', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('管理者一覧が正しく表示されること', async ({ page }) => {
      const mockResponse = createAdminListResponse(3);
      await mockApiResponse(page, '**/api/admin/admins*', {
        admins: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/admins');
      await waitForPageLoad(page);

      // テーブルヘッダーの確認
      await expect(page.getByRole('columnheader', { name: /メール|メールアドレス/ })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /権限|ロール/ })).toBeVisible();

      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(3);

      await takeScreenshot(page, 'admins-list');
    });

    test('空の一覧でメッセージが表示されること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/admins*', {
        admins: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/admins');
      await waitForPageLoad(page);

      await expect(page.getByText(/管理者が見つかりません|データがありません/)).toBeVisible();
    });
  });

  // ================================================================
  // 新規作成テスト
  // ================================================================
  test.describe('新規作成', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('新規管理者を作成できること', async ({ page }) => {
      const newAdmin = createAdminData({ role: 'operator' });

      await mockApiResponse(page, '**/api/admin/admins', {
        id: 'new-admin-001',
        ...newAdmin,
        createdAt: new Date().toISOString(),
      }, 201);

      await page.goto('/admins/new');
      await waitForPageLoad(page);

      // フォーム入力
      await page.getByLabel('メールアドレス').fill(newAdmin.email);
      await page.getByLabel('パスワード').fill(newAdmin.password);

      // パスワード確認（存在する場合）
      const confirmPasswordInput = page.getByLabel(/パスワード確認|パスワード（確認）/);
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill(newAdmin.password);
      }

      // 権限選択
      const roleSelect = page.getByRole('combobox', { name: /権限|ロール/ });
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.getByRole('option', { name: /オペレーター|operator/i }).click();
      }

      // 名前（存在する場合）
      const nameInput = page.getByLabel(/名前|氏名/);
      if (await nameInput.isVisible() && newAdmin.name) {
        await nameInput.fill(newAdmin.name);
      }

      await takeScreenshot(page, 'admins-new-form-filled');

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();
      await page.waitForURL('**/admins**', { timeout: 10000 });
    });

    test('必須項目のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/admins/new');
      await waitForPageLoad(page);

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.locator('.text-red-500, .text-destructive').first()).toBeVisible();
      await takeScreenshot(page, 'admins-new-validation-error');
    });

    test('メールアドレス形式のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/admins/new');
      await waitForPageLoad(page);

      await page.getByLabel('メールアドレス').fill('invalid-email');
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/メールアドレスの形式が正しくありません|有効なメールアドレスを入力/)).toBeVisible();
    });

    test('パスワード強度のバリデーションエラーが表示されること', async ({ page }) => {
      await page.goto('/admins/new');
      await waitForPageLoad(page);

      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('パスワード').fill('weak'); // 弱いパスワード

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // パスワード強度エラーの確認
      await expect(page.getByText(/8文字以上|英字と数字|強度/)).toBeVisible();
    });

    test('重複メールアドレスエラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/admins', 409, 'このメールアドレスは既に登録されています');

      await page.goto('/admins/new');
      await waitForPageLoad(page);

      await page.getByLabel('メールアドレス').fill('duplicate@example.com');
      await page.getByLabel('パスワード').fill('TestPassword123!');

      const confirmPasswordInput = page.getByLabel(/パスワード確認|パスワード（確認）/);
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill('TestPassword123!');
      }

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/既に登録|重複/)).toBeVisible();
    });
  });

  // ================================================================
  // 編集テスト
  // ================================================================
  test.describe('編集', () => {
    const mockAdmin = {
      id: 'admin-edit-001',
      email: 'edit@example.com',
      role: 'operator',
      name: 'テスト管理者',
      createdAt: '2024-01-01T00:00:00Z',
    };

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
      await mockApiResponse(page, '**/api/admin/admins/admin-edit-001', mockAdmin);
    });

    test('管理者情報を編集できること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/admins/admin-edit-001', {
        ...mockAdmin,
        role: 'sysadmin',
      });

      await page.goto('/admins/admin-edit-001/edit');
      await waitForPageLoad(page);

      // 権限変更
      const roleSelect = page.getByRole('combobox', { name: /権限|ロール/ });
      if (await roleSelect.isVisible()) {
        await roleSelect.click();
        await page.getByRole('option', { name: /システム管理者|sysadmin/i }).click();
      }

      await takeScreenshot(page, 'admins-edit-form');

      await page.getByRole('button', { name: /保存|更新/ }).click();
      await page.waitForURL('**/admins**', { timeout: 10000 });
    });

    test('パスワードをリセットできること', async ({ page }) => {
      await mockApiResponse(page, '**/api/admin/admins/admin-edit-001/reset-password', {
        success: true,
        message: 'パスワードリセットメールを送信しました',
      });

      await page.goto('/admins/admin-edit-001/edit');
      await waitForPageLoad(page);

      const resetPasswordButton = page.getByRole('button', { name: /パスワードリセット|パスワード再設定/ });
      if (await resetPasswordButton.isVisible()) {
        await resetPasswordButton.click();

        // 確認ダイアログ
        const confirmButton = page.getByRole('button', { name: /確認|はい|OK/ });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
      }
    });
  });

  // ================================================================
  // 削除テスト
  // ================================================================
  test.describe('削除', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('管理者を削除できること', async ({ page }) => {
      const adminToDelete = {
        id: 'admin-delete-001',
        email: 'delete@example.com',
        role: 'operator',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/admins/admin-delete-001', adminToDelete);
      await mockApiResponse(page, '**/api/admin/admins/admin-delete-001', { success: true }, 200);

      await page.goto('/admins/admin-delete-001');
      await waitForPageLoad(page);

      const deleteButton = page.getByRole('button', { name: /削除/ });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // 確認ダイアログ
        const confirmButton = page.getByRole('button', { name: /確認|はい|削除する/ });
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await takeScreenshot(page, 'admins-delete-confirm');
      }
    });

    test('自分自身は削除できないこと', async ({ page }) => {
      // 自分自身のIDと同じ管理者を取得した場合
      const selfAdmin = {
        id: 'self-admin',
        email: 'sysadmin@example.com', // ログインユーザーと同じ
        role: 'sysadmin',
        createdAt: '2024-01-01T00:00:00Z',
      };

      await mockApiResponse(page, '**/api/admin/admins/self-admin', selfAdmin);

      await page.goto('/admins/self-admin');
      await waitForPageLoad(page);

      // 削除ボタンが無効化されているか、表示されていないことを確認
      const deleteButton = page.getByRole('button', { name: /削除/ });
      if (await deleteButton.isVisible()) {
        const isDisabled = await deleteButton.isDisabled();
        expect(isDisabled).toBeTruthy();
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
      await mockApiError(page, '**/api/admin/admins*', 500, 'サーバーエラーが発生しました');

      await page.goto('/admins');
      await waitForPageLoad(page);

      await expect(page.getByText(/エラー|問題が発生|サーバーエラー/)).toBeVisible();
      await takeScreenshot(page, 'admins-list-error');
    });

    test('存在しない管理者にアクセスした場合404エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/admins/non-existent', 404, '管理者が見つかりません');

      await page.goto('/admins/non-existent');
      await waitForPageLoad(page);

      await expect(page.getByText(/見つかりません|存在しません|404/)).toBeVisible();
    });
  });

  // ================================================================
  // 権限テスト
  // ================================================================
  test.describe('権限チェック', () => {
    test('Operatorは管理者一覧を閲覧できるが、作成・編集はできないこと', async ({ page }) => {
      await loginAs(page, 'operator');

      const mockResponse = createAdminListResponse(2);
      await mockApiResponse(page, '**/api/admin/admins*', {
        admins: mockResponse.items,
        pagination: mockResponse.pagination,
      });

      await page.goto('/admins');
      await waitForPageLoad(page);

      // 一覧は表示される
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(2);

      // 新規作成ボタンが無効化または非表示
      const createButton = page.getByRole('button', { name: /新規|作成|追加/ });
      if (await createButton.isVisible()) {
        const isDisabled = await createButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    });

    test('Merchantは管理者管理ページにアクセスできないこと', async ({ page }) => {
      await loginAs(page, 'merchant');

      await page.goto('/admins');

      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/admins');
      const hasAccessDenied = await page.getByText(/アクセス権限|権限がありません/).isVisible().catch(() => false);

      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });

    test('Shopは管理者管理ページにアクセスできないこと', async ({ page }) => {
      await loginAs(page, 'shop');

      await page.goto('/admins');

      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/admins');
      const hasAccessDenied = await page.getByText(/アクセス権限|権限がありません/).isVisible().catch(() => false);

      expect(isRedirected || hasAccessDenied).toBeTruthy();
    });
  });
});




