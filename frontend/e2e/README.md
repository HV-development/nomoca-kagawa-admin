# nomoca-kagawa-admin E2Eテスト

Playwrightを使用した管理画面のE2Eテストスイートです。

## 前提条件

- Node.js 22.x
- pnpm 8.x
- Docker（ローカル開発環境）
- tamanomi-api が起動していること

## セットアップ

### 1. 依存関係のインストール

\`\`\`bash
cd frontend
pnpm install
\`\`\`

### 2. 環境変数の設定

e2e/.env ファイルを確認:

\`\`\`bash
cat e2e/.env
\`\`\`

主な環境変数:

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| E2E_BASE_URL | テスト対象のベースURL | http://localhost:3005 |
| E2E_ADMIN_EMAIL | テスト管理者のメールアドレス | nomoca-admin@example.com |
| E2E_ADMIN_PASSWORD | テスト管理者のパスワード | nomoca-admin123 |
| E2E_ENV | 環境識別子（local/staging/production） | local |

### 3. ローカル開発用設定

ローカルで開発サーバーを起動する場合は .env.local を作成:

\`\`\`
API_BASE_URL=http://localhost:3002/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1
\`\`\`

### 4. サービスの起動

\`\`\`bash
# tamanomi-hub ディレクトリで
docker-compose up -d

# または開発サーバーを直接起動
pnpm dev --port 3005
\`\`\`

## テストの実行

### 全テスト実行

\`\`\`bash
pnpm test:e2e
\`\`\`

### UIモードで実行（デバッグ用）

\`\`\`bash
pnpm test:e2e:ui
\`\`\`

### ブラウザ表示モードで実行

\`\`\`bash
pnpm test:e2e:headed
\`\`\`

### 特定のテストファイルのみ実行

\`\`\`bash
pnpm test:e2e login.spec.ts
pnpm test:e2e merchants.spec.ts
\`\`\`

## テストの構成

### プロジェクト分類

| プロジェクト | 説明 | 認証状態 |
|------------|------|---------|
| setup | パスワード認証を実行し .auth/admin.json に保存 | なし |
| authenticated | storageStateを使用（実データ） | あり |
| auth-flow | 認証フローのテスト | なし |
| error-handling | エラーハンドリングのテスト | なし |

### テストファイル一覧

| ファイル | 説明 | プロジェクト |
|---------|------|-------------|
| auth.setup.ts | 認証セットアップ（パスワード認証） | setup |
| login.spec.ts | ログインページのUIテスト | auth-flow |
| protection.spec.ts | ページ保護のテスト | auth-flow |
| merchants.spec.ts | マーチャント管理のテスト | authenticated |
| shops.spec.ts | 店舗管理のテスト | authenticated |
| coupons-crud.spec.ts | クーポン管理のテスト | authenticated |
| admins.spec.ts | 管理者アカウント管理のテスト | authenticated |
| users.spec.ts | ユーザー管理のテスト | authenticated |
| headers.spec.ts | HTTPヘッダーのテスト | authenticated |
| role_based_display.spec.ts | 権限別表示のテスト | authenticated |
| error-handling.spec.ts | エラーハンドリングのテスト | error-handling |

## ディレクトリ構成

\`\`\`
e2e/
├── .env                    # 環境変数
├── auth.setup.ts           # 認証セットアップ
├── *.spec.ts               # テストファイル
├── utils/
│   ├── test-helpers.ts     # 共通ヘルパー関数
│   └── test-data.ts        # テストデータユーティリティ
└── README.md               # このファイル
\`\`\`

## 認証フロー

1. auth.setup.ts が実行され、パスワード認証を行う
2. 認証状態が .auth/admin.json に保存される
3. authenticated プロジェクトのテストは storageState で認証状態を再利用
4. テスト間で認証を共有し、効率的なテスト実行を実現

## テスト用アカウント

シードデータで作成されるテストアカウント:

| メールアドレス | パスワード | 権限 | 用途 |
|--------------|-----------|------|-----|
| nomoca-admin@example.com | nomoca-admin123 | operator | 主要テスト用 |
| admin@example.com | admin123 | sysadmin | 全権限テスト用 |

## トラブルシューティング

### 認証に失敗する

- APIサーバーが起動していることを確認: curl http://localhost:3002/api/v1/health
- .env.local が正しく設定されていることを確認
- シードデータが投入されていることを確認: pnpm prisma db seed

### テストがタイムアウトする

- サーバーが起動していることを確認: curl http://localhost:3005
- ポート3005が他のプロセスで使用されていないことを確認: lsof -i :3005

### ページがローディング中のまま

- API接続設定を確認（Docker内は api:3002、ローカルは localhost:3002）
- .env.local でローカル用のAPI URLを設定

## レポート

テスト実行後、HTMLレポートが生成されます:

\`\`\`bash
pnpm exec playwright show-report
\`\`\`

スクリーンショット・動画・トレースは test-results/ に保存されます。

## 注意事項

- テストは実データを使用するため、データベースの状態に依存します
- ステージング/本番環境での実行時は E2E_ENV を適切に設定してください
- クーポン履歴リセット等の破壊的操作はローカル環境でのみ実行されます
