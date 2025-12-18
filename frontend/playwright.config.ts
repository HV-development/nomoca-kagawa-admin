import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* テストの最大実行時間 */
  timeout: 30 * 1000,
  expect: {
    /* アサーションのタイムアウト */
    timeout: 5000,
  },
  /* テストを並列実行 */
  fullyParallel: true,
  /* CIで失敗したテストを再実行しない */
  forbidOnly: !!process.env.CI,
  /* CIでのみ失敗したテストを再実行 */
  retries: process.env.CI ? 2 : 0,
  /* CIでのみ並列実行を制限 */
  workers: process.env.CI ? 1 : undefined,
  /* レポーター設定 */
  reporter: 'html',
  /* 共有設定 */
  use: {
    /* ベースURL（開発サーバーのURL） */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    /* アクションのタイムアウト */
    actionTimeout: 10 * 1000,
    /* ナビゲーションのタイムアウト */
    navigationTimeout: 30 * 1000,
    /* スクリーンショットを失敗時のみ取得 */
    screenshot: 'only-on-failure',
    /* 動画を常に録画 */
    video: 'on',
    /* トレースを失敗時のみ取得 */
    trace: 'on-first-retry',
  },

  /* プロジェクト設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 開発サーバーの設定 */
  webServer: {
    command: 'pnpm dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // サーバーが完全に起動するまで待機
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

