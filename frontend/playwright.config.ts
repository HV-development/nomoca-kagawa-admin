import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { config } from 'dotenv';

// E2Eテスト用の.envファイルを読み込む
const envPath = path.resolve(__dirname, 'e2e', '.env');
config({ path: envPath });

// 認証状態ファイルのパス
const authFile = '.auth/admin.json';

/**
 * Playwright設定ファイル
 * 
 * テストプロジェクトの分類:
 * 1. setup - 認証セットアップ（パスワード認証を実行してstorageStateを保存）
 * 2. authenticated - storageStateを使用する全テスト（実データ使用）
 * 3. crud-operations - CRUD操作テスト（シリアル実行）
 * 4. role-permissions - ロール別権限テスト（各ロールでログイン）
 * 5. auth-flow - 認証フローのテスト（認証状態を使用しない）
 * 6. error-handling - エラーハンドリングテスト
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    /* テストの最大実行時間 */
    timeout: 60 * 1000,
    expect: {
        /* アサーションのタイムアウト */
        timeout: 10000,
    },
    /* テストを並列実行 */
    fullyParallel: true,
    /* CIで失敗したテストを再実行しない */
    forbidOnly: !!process.env.CI,
    /* CIでのみ失敗したテストを再実行 */
    retries: process.env.CI ? 2 : 0,
    /* 並列実行数を設定 */
    workers: process.env.CI ? 2 : 4,
    /* レポーター設定 */
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
        ['line'],
    ],
    /* 共有設定 */
    use: {
        /* ベースURL */
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
        /* アクションのタイムアウト */
        actionTimeout: 15 * 1000,
        /* ナビゲーションのタイムアウト */
        navigationTimeout: 30 * 1000,
        /* スクリーンショット設定 */
        screenshot: {
            mode: 'only-on-failure',
            fullPage: true,
        },
        /* 動画設定 */
        video: {
            mode: 'retain-on-failure',
            size: { width: 1280, height: 720 },
        },
        /* トレース */
        trace: 'retain-on-failure',
    },

    /* プロジェクト設定 */
    projects: [
        // セットアップ: 認証状態を作成（パスワード認証を実行）
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        // 認証済みテスト: storageStateを使用して認証を再利用（実データ使用）
        {
            name: 'authenticated',
            dependencies: ['setup'],
            testMatch: [
                'merchants.spec.ts',
                'shops.spec.ts',
                'coupons-crud.spec.ts',
                'admins.spec.ts',
                'users.spec.ts',
                'headers.spec.ts',
                'role_based_display.spec.ts',
            ],
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
            },
        },
        // CRUD操作テスト: storageStateを使用、シリアル実行
        {
            name: 'crud-operations',
            dependencies: ['setup'],
            testMatch: /crud-operations\.spec\.ts/,
            fullyParallel: false, // データ整合性のためシリアル実行
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
            },
        },
        // ロール別権限テスト: 各ロールでログインするため認証状態を使用しない
        {
            name: 'role-permissions',
            testMatch: /role-permissions\.spec\.ts/,
            fullyParallel: false, // 複数のログインを行うためシリアル実行
            use: { ...devices['Desktop Chrome'] },
        },
        // 認証フローテスト: シリアル実行
        {
            name: 'auth-flow',
            testMatch: /(login|protection)\.spec\.ts/,
            fullyParallel: false, // 認証フローの競合を避けるためシリアル実行
            use: { ...devices['Desktop Chrome'] },
        },
        // エラーハンドリングテスト: storageStateを使用
        {
            name: 'error-handling',
            dependencies: ['setup'],
            testMatch: /error-handling\.spec\.ts/,
            fullyParallel: false, // エラー状態のテストはシリアル実行が望ましい
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
            },
        },
    ],

    /* 開発サーバーの設定 */
    webServer: {
        command: 'pnpm dev --port 3005',
        url: 'http://localhost:3005',
        reuseExistingServer: true,
        timeout: 120 * 1000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
