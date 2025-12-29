import { test as setup } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'nomoca-admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'nomoca-admin123';
const authFile = '.auth/admin.json';

/**
 * 認証セットアップ
 * 
 * パスワード認証を実行し、認証状態を .auth/admin.json に保存します。
 * この認証状態は authenticated プロジェクトのテストで再利用されます。
 */
setup('authenticate as admin', async ({ page }) => {
  console.log('[Auth Setup] Starting authentication...');
  console.log(`[Auth Setup] Email: ${ADMIN_EMAIL}`);

  // ログインページに移動
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // ログインフォームが表示されるまで待機
  await page.waitForSelector('input', { timeout: 10000 });

  // 認証情報を入力
  const emailInput = page.getByLabel('メールアドレス');
  const passwordInput = page.getByLabel('パスワード');

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL);
  } else {
    // フォールバック: placeholder で検索
    await page.getByPlaceholder(/email|メール/i).fill(ADMIN_EMAIL);
  }

  if (await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill(ADMIN_PASSWORD);
  } else {
    // フォールバック: type="password" で検索
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  }

  // ログインボタンをクリック
  const loginButton = page.getByRole('button', { name: 'ログイン', exact: true });
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
  } else {
    // フォールバック
    await page.getByRole('button', { name: /ログイン|Login/i }).click();
  }

  // ログイン後の遷移を待機（最大30秒）
  // URLが変わるか、エラーメッセージが表示されないことを確認
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });
    console.log('[Auth Setup] Login successful - redirected to:', page.url());
  } catch {
    // URL変わらない場合はエラーを確認
    const errorMessage = await page.locator('.text-red-500, .text-destructive, [role="alert"]').textContent().catch(() => null);
    if (errorMessage) {
      throw new Error(`[Auth Setup] Login failed with error: ${errorMessage}`);
    }
    // エラーがなければCookieを確認して続行
    console.log('[Auth Setup] URL did not change, checking cookies...');
  }

  // 認証状態に必要なCookieが設定されていることを確認
  const cookies = await page.context().cookies();
  const accessTokenCookie = cookies.find(
    (c) => c.name === 'accessToken' || c.name.includes('accessToken')
  );
  
  if (!accessTokenCookie) {
    console.log('[Auth Setup] Available cookies:', cookies.map(c => c.name).join(', '));
    throw new Error('[Auth Setup] Access token cookie not found after login');
  }
  
  console.log('[Auth Setup] Access token cookie found');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
  console.log(`[Auth Setup] Authentication state saved to ${authFile}`);
});
