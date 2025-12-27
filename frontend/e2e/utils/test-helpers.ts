import { Page, BrowserContext, expect } from '@playwright/test';

/**
 * 管理画面用テストヘルパー関数
 */

// ユーザー権限タイプ
export type AdminRole = 'sysadmin' | 'operator' | 'merchant' | 'shop';

// 権限別のモックデータ
const ROLE_MOCK_DATA: Record<AdminRole, object> = {
  sysadmin: {
    accountType: 'admin',
    email: 'sysadmin@example.com',
    role: 'sysadmin',
  },
  operator: {
    accountType: 'admin',
    email: 'operator@example.com',
    role: 'operator',
  },
  merchant: {
    accountType: 'merchant',
    email: 'merchant@example.com',
    merchantId: 'merchant-test-001',
  },
  shop: {
    accountType: 'shop',
    email: 'shop@example.com',
    shopId: 'shop-test-001',
  },
};

/**
 * スクリーンショットを取得する
 * @param page Playwrightのページオブジェクト
 * @param name スクリーンショットの名前（拡張子なし）
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * 指定した権限でログイン状態を設定する（APIモックを使用）
 * @param page Playwrightのページオブジェクト
 * @param role 権限タイプ
 * @param customData 追加のカスタムデータ
 */
export async function loginAs(
  page: Page,
  role: AdminRole,
  customData?: Partial<typeof ROLE_MOCK_DATA[AdminRole]>
): Promise<void> {
  const mockData = { ...ROLE_MOCK_DATA[role], ...customData };

  // /api/me エンドポイントをモック
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    });
  });

  // アクセストークンのCookieを設定
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: `mock_${role}_token`,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * 実際のログインフローを実行する（E2E用）
 * @param page Playwrightのページオブジェクト
 * @param email メールアドレス
 * @param password パスワード
 */
export async function performLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
}

/**
 * APIレスポンスをモックする
 * @param page Playwrightのページオブジェクト
 * @param urlPattern URLパターン（ワイルドカード使用可能）
 * @param response レスポンスデータ
 * @param status HTTPステータスコード（デフォルト: 200）
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string,
  response: object,
  status: number = 200
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * APIエラーレスポンスをモックする
 * @param page Playwrightのページオブジェクト
 * @param urlPattern URLパターン
 * @param status HTTPステータスコード
 * @param message エラーメッセージ
 */
export async function mockApiError(
  page: Page,
  urlPattern: string,
  status: number,
  message: string
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        error: true,
        message,
        statusCode: status,
      }),
    });
  });
}

/**
 * ネットワークエラーをモックする
 * @param page Playwrightのページオブジェクト
 * @param urlPattern URLパターン
 */
export async function mockNetworkError(
  page: Page,
  urlPattern: string
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.abort('failed');
  });
}

/**
 * 全てのAPIモックをクリアする
 * @param page Playwrightのページオブジェクト
 */
export async function clearAllMocks(page: Page): Promise<void> {
  await page.unrouteAll();
}

/**
 * ページのローディングが完了するまで待機する
 * @param page Playwrightのページオブジェクト
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * 指定した要素が表示されるまで待機する
 * @param page Playwrightのページオブジェクト
 * @param selector セレクター
 * @param timeout タイムアウト（ミリ秒）
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { timeout });
}

/**
 * トーストメッセージを確認する
 * @param page Playwrightのページオブジェクト
 * @param message 期待するメッセージ（部分一致）
 */
export async function expectToastMessage(
  page: Page,
  message: string
): Promise<void> {
  // shadcn/uiのToastコンポーネントを想定
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: message });
  await expect(toast).toBeVisible({ timeout: 5000 });
}

/**
 * 確認ダイアログを処理する
 * @param page Playwrightのページオブジェクト
 * @param accept 承認するかどうか
 */
export async function handleConfirmDialog(
  page: Page,
  accept: boolean
): Promise<void> {
  page.on('dialog', async (dialog) => {
    if (accept) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

/**
 * テーブルの行数を取得する
 * @param page Playwrightのページオブジェクト
 * @param tableSelector テーブルのセレクター
 */
export async function getTableRowCount(
  page: Page,
  tableSelector: string = 'table tbody'
): Promise<number> {
  const rows = page.locator(`${tableSelector} tr`);
  return await rows.count();
}

/**
 * ページネーションで次のページに移動する
 * @param page Playwrightのページオブジェクト
 */
export async function goToNextPage(page: Page): Promise<void> {
  const nextButton = page.getByRole('button', { name: /次へ|Next/i });
  await nextButton.click();
  await waitForPageLoad(page);
}

/**
 * フォームの入力値をクリアする
 * @param page Playwrightのページオブジェクト
 * @param selector 入力フィールドのセレクター
 */
export async function clearInput(page: Page, selector: string): Promise<void> {
  await page.locator(selector).clear();
}

/**
 * ファイルアップロードを実行する
 * @param page Playwrightのページオブジェクト
 * @param selector ファイル入力のセレクター
 * @param filePath アップロードするファイルのパス
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}




