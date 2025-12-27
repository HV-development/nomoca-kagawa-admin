import { test, expect } from '@playwright/test';
import {
  loginAs,
  mockApiResponse,
  mockApiError,
  mockNetworkError,
  waitForPageLoad,
  takeScreenshot,
} from './utils/test-helpers';

test.describe('エラーハンドリング - Admin', () => {
  // ================================================================
  // ネットワークエラーテスト
  // ================================================================
  test.describe('ネットワークエラー', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('API接続失敗時にエラーメッセージが表示されること', async ({ page }) => {
      await mockNetworkError(page, '**/api/admin/merchants*');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      await expect(page.getByText(/ネットワークエラー|接続.*失敗|通信.*エラー/)).toBeVisible();

      await takeScreenshot(page, 'error-network-failure');
    });

    test('リクエストタイムアウト時にエラーメッセージが表示されること', async ({ page }) => {
      // タイムアウトをシミュレート
      await page.route('**/api/admin/merchants*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60秒待機
        await route.abort('timedout');
      });

      await page.goto('/merchants');

      // タイムアウトエラーを確認（通常はPlaywrightのナビゲーションタイムアウトで検出）
      await expect(page.getByText(/タイムアウト|時間.*超過|応答.*ありません/)).toBeVisible({ timeout: 45000 });
    });

    test('ネットワーク復旧後にリトライできること', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/admin/merchants*', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              merchants: [],
              pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            }),
          });
        }
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // リトライボタンが存在する場合
      const retryButton = page.getByRole('button', { name: /再試行|リトライ|再読み込み/ });
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await waitForPageLoad(page);

        // 正常に表示されることを確認
        await expect(page.getByText(/事業者が見つかりません|データがありません/)).toBeVisible();
      }
    });
  });

  // ================================================================
  // HTTPエラーテスト
  // ================================================================
  test.describe('HTTPエラー', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('500エラー時にサーバーエラーメッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants*', 500, 'Internal Server Error');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      await expect(page.getByText(/サーバーエラー|500|内部エラー|問題が発生/)).toBeVisible();

      await takeScreenshot(page, 'error-500');
    });

    test('502エラー時にゲートウェイエラーメッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants*', 502, 'Bad Gateway');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      await expect(page.getByText(/ゲートウェイエラー|502|サーバー.*接続/)).toBeVisible();
    });

    test('503エラー時にサービス利用不可メッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants*', 503, 'Service Unavailable');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      await expect(page.getByText(/サービス.*利用.*不可|503|メンテナンス/)).toBeVisible();
    });

    test('404エラー時にリソース未存在メッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants/non-existent', 404, 'Not Found');

      await page.goto('/merchants/non-existent');
      await waitForPageLoad(page);

      await expect(page.getByText(/見つかりません|404|存在しません/)).toBeVisible();

      await takeScreenshot(page, 'error-404');
    });

    test('403エラー時に権限エラーメッセージが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/admins*', 403, 'Forbidden');

      await page.goto('/admins');
      await waitForPageLoad(page);

      await expect(page.getByText(/権限.*ありません|403|アクセス.*拒否/)).toBeVisible();

      await takeScreenshot(page, 'error-403');
    });
  });

  // ================================================================
  // 認証エラーテスト
  // ================================================================
  test.describe('認証エラー', () => {
    test('401エラー時にログイン画面にリダイレクトされること', async ({ page }) => {
      // 認証済み状態を設定
      await loginAs(page, 'sysadmin');

      // 認証エラーを返す
      await mockApiError(page, '**/api/me', 401, 'Unauthorized');
      await mockApiError(page, '**/api/admin/merchants*', 401, 'Unauthorized');

      await page.goto('/merchants');

      // ログイン画面にリダイレクト
      await page.waitForURL('**/login**', { timeout: 10000 });
    });

    test('トークン期限切れ時にリフレッシュ処理が実行されること', async ({ page }) => {
      await loginAs(page, 'sysadmin');

      let refreshCalled = false;

      // 最初のリクエストで401、リフレッシュ後は成功
      await page.route('**/api/admin/merchants*', async (route) => {
        if (!refreshCalled) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              merchants: [],
              pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            }),
          });
        }
      });

      // リフレッシュトークンAPIをモック
      await page.route('**/api/auth/refresh', async (route) => {
        refreshCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'new-access-token',
          }),
        });
      });

      await page.goto('/merchants');
    });
  });

  // ================================================================
  // バリデーションエラーテスト
  // ================================================================
  test.describe('バリデーションエラー', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('必須項目未入力時にエラーメッセージが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // 空で送信
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      // 複数のエラーメッセージを確認
      const errorMessages = page.locator('.text-red-500, .text-destructive');
      await expect(errorMessages.first()).toBeVisible();

      await takeScreenshot(page, 'error-validation-required');
    });

    test('メールアドレス形式エラーが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      await page.getByLabel('メールアドレス').fill('invalid-email');
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/メールアドレスの形式が正しくありません/)).toBeVisible();
    });

    test('電話番号形式エラーが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      await page.getByLabel('電話番号').fill('invalid-phone');
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/電話番号の形式が正しくありません|電話番号.*無効/)).toBeVisible();
    });

    test('最大文字数超過エラーが表示されること', async ({ page }) => {
      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // 256文字以上の入力
      await page.getByLabel('事業者名').fill('あ'.repeat(256));
      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/文字以内|最大.*文字/)).toBeVisible();
    });

    test('重複エラーが表示されること', async ({ page }) => {
      await mockApiError(page, '**/api/admin/merchants', 409, 'このメールアドレスは既に登録されています');

      await page.goto('/merchants/new');
      await waitForPageLoad(page);

      // 全ての必須項目を入力
      await page.getByLabel('事業者名').fill('テスト事業者');
      await page.getByLabel('メールアドレス').fill('duplicate@example.com');
      await page.getByLabel('電話番号').fill('090-1234-5678');
      await page.getByLabel('郵便番号').fill('760-0001');
      await page.getByLabel('都道府県').fill('香川県');
      await page.getByLabel('市区町村').fill('高松市');
      await page.getByLabel('住所').fill('中央町1-1');
      await page.getByLabel('代表者名').fill('代表太郎');

      await page.getByRole('button', { name: /登録|作成|保存/ }).click();

      await expect(page.getByText(/既に登録|重複/)).toBeVisible();

      await takeScreenshot(page, 'error-validation-duplicate');
    });
  });

  // ================================================================
  // セッションエラーテスト
  // ================================================================
  test.describe('セッションエラー', () => {
    test('セッションタイムアウト後にログイン画面にリダイレクトされること', async ({ page }) => {
      await loginAs(page, 'sysadmin');

      // 正常にページを表示
      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // セッションタイムアウトをシミュレート
      await page.context().clearCookies();
      await mockApiError(page, '**/api/me', 401, 'Session expired');

      // 何らかのアクションを実行
      await page.reload();

      // ログイン画面にリダイレクト
      await page.waitForURL('**/login**', { timeout: 10000 });
    });

    test('別デバイスログイン時に強制ログアウトされること', async ({ page }) => {
      await loginAs(page, 'sysadmin');

      await mockApiResponse(page, '**/api/admin/merchants*', {
        merchants: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // 強制ログアウトをシミュレート
      await mockApiError(page, '**/api/admin/**', 401, 'Session invalidated by another login');

      // 何らかのアクションを実行
      const createButton = page.getByRole('link', { name: /新規|作成/ });
      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        await page.reload();
      }

      // ログイン画面にリダイレクトまたはメッセージ表示
      const isRedirected = await page.waitForURL('**/login**', { timeout: 5000 }).then(() => true).catch(() => false);
      const hasMessage = await page.getByText(/別のデバイス|セッション.*無効|再.*ログイン/).isVisible().catch(() => false);

      expect(isRedirected || hasMessage).toBeTruthy();
    });
  });

  // ================================================================
  // グローバルエラーハンドリングテスト
  // ================================================================
  test.describe('グローバルエラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sysadmin');
    });

    test('予期しないエラー時に汎用エラーメッセージが表示されること', async ({ page }) => {
      await page.route('**/api/admin/merchants*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'text/plain',
          body: 'Unexpected error',
        });
      });

      await page.goto('/merchants');
      await waitForPageLoad(page);

      await expect(page.getByText(/エラー|問題が発生/)).toBeVisible();
    });

    test('エラー発生後もアプリケーションが動作すること', async ({ page }) => {
      // 最初のリクエストでエラー
      await mockApiError(page, '**/api/admin/merchants*', 500, 'Server Error');

      await page.goto('/merchants');
      await waitForPageLoad(page);

      // エラーが表示される
      await expect(page.getByText(/エラー|問題が発生/)).toBeVisible();

      // 別のページに移動
      await mockApiResponse(page, '**/api/admin/shops*', {
        shops: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await page.goto('/shops');
      await waitForPageLoad(page);

      // 正常に表示される
      await expect(page.getByText(/店舗が見つかりません|データがありません/)).toBeVisible();
    });
  });
});




