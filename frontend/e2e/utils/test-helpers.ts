import { Page, expect } from '@playwright/test';

/**
 * 管理画面用テストヘルパー関数
 * 
 * モック関数は廃止され、実データを使用したテストに移行しました。
 * 認証は storageState（auth.setup.ts）で管理されます。
 */

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
 * ページのローディングが完了するまで待機する
 * @param page Playwrightのページオブジェクト
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {
    // networkidleがタイムアウトした場合はdomcontentloadedで代替
    await page.waitForLoadState('domcontentloaded');
  }
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
