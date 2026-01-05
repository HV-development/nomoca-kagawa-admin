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
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 60 * 1000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : 4,
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
        ['line'],
    ],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3005',
        actionTimeout: 15 * 1000,
        navigationTimeout: 30 * 1000,
        screenshot: {
            mode: 'on',
            fullPage: true,
        },
        video: {
            mode: 'on',
            size: { width: 1280, height: 720 },
        },
        trace: 'on',
    },

    projects: [
        // セットアップ: slowMoなしで高速に認証
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
            use: { 
                ...devices['Desktop Chrome'],
                // setupはslowMoなしで高速実行
            },
        },
        // 認証済みテスト: slowMoありで動画に操作が映る
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
                launchOptions: {
                    slowMo: 300, // 動画用に遅延
                },
            },
        },
        // APIリクエストテスト: 並列実行を無効化して安定性を向上
        {
            name: 'api-requests',
            dependencies: ['setup'],
            testMatch: /api-requests\.spec\.ts/,
            fullyParallel: false, // 並列実行を無効化
            timeout: 120 * 1000, // タイムアウトを120秒に延長
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
                launchOptions: {
                    slowMo: 300, // 動画用に遅延
                },
            },
        },
        // CRUD操作テスト
        {
            name: 'crud-operations',
            dependencies: ['setup'],
            testMatch: /crud-operations\.spec\.ts/,
            fullyParallel: false,
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
                launchOptions: {
                    slowMo: 300,
                },
            },
        },
        // ロール別権限テスト: slowMoなしで高速実行（ログインが多いため）
        {
            name: 'role-permissions',
            testMatch: /role-permissions\.spec\.ts/,
            fullyParallel: false,
            use: { 
                ...devices['Desktop Chrome'],
                // ログインが多いのでslowMoなし
            },
        },
        // 認証フローテスト: slowMoなし
        {
            name: 'auth-flow',
            testMatch: /(login|protection)\.spec\.ts/,
            fullyParallel: false,
            use: { 
                ...devices['Desktop Chrome'],
            },
        },
        // エラーハンドリングテスト
        {
            name: 'error-handling',
            dependencies: ['setup'],
            testMatch: /error-handling\.spec\.ts/,
            fullyParallel: false,
            use: {
                ...devices['Desktop Chrome'],
                storageState: authFile,
                launchOptions: {
                    slowMo: 300,
                },
            },
        },
    ],

    webServer: {
        command: 'pnpm dev --port 3005',
        url: 'http://localhost:3005',
        reuseExistingServer: false,  // 常に新しいサーバーを起動
        timeout: 120 * 1000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
