# nomoca-kagawa-admin

nomoca 香川 管理画面 - Next.js + TypeScript + Tailwind CSS

## 🚀 特徴

- **Next.js 14**: React フレームワーク（Turbopack対応）
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストのCSS
- **型安全性**: `@hv-development/schemas`パッケージを使用した型安全なAPI通信
- **管理機能**: 店舗・マーチャント・ユーザー管理

## 🛠️ 環境構築

### 前提条件

- Node.js 18以上
- pnpm
- Docker & Docker Compose
- tamanomi-api が起動していること

### 開発方法

このプロジェクトは**Docker環境での開発**を前提としています。GitHub Packagesの認証が必要なため、ローカル環境での直接インストールは困難です。

#### 🐳 Docker環境での開発（推奨）

1. **Dockerコンテナを起動**

```bash
# Docker Composeで起動
cd infrastructure/docker
docker-compose up -d admin

# ログを確認
docker-compose logs -f admin
```

2. **アクセス**

- **Admin Panel**: http://localhost:3001

#### 💻 ローカル環境での型チェック・リンター実行

IDEでの型チェックやリンター実行をローカルで行いたい場合：

1. **Dockerコンテナを起動**

```bash
pnpm docker:up
```

2. **ローカル開発環境をセットアップ**

```bash
pnpm setup:local
```

3. **型チェック・リンター実行**

```bash
# 型チェック
pnpm type-check

# リンター実行
pnpm lint
```

#### 🔄 依存関係が更新された場合

```bash
# Dockerコンテナを再起動
pnpm docker:down
pnpm docker:up

# ローカル環境を再セットアップ
pnpm setup:local
```

### 環境変数

```env
# API設定
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1

# サーバーサイドAPI設定（APIルート用）
API_BASE_URL=http://localhost:3002/api/v1
JWT_SECRET=your-super-secret-jwt-key-here

# Next.js設定
NEXT_TELEMETRY_DISABLED=1
WATCHPACK_POLLING=true
NEXT_CACHE_DISABLED=1
```

## 🌐 アクセス先

- **Admin Panel**: http://localhost:3001

## 🔑 ログイン

- **管理者**: admin@nomoca-kagawa.com / admin123
- **オペレーター**: operator@nomoca-kagawa.com / operator123

## 🧪 テスト

```bash
# リント実行
pnpm lint

# 型チェック
pnpm type-check
```

## 🚨 トラブルシューティング

### Docker関連の問題

#### node_modulesが見つからない場合

```bash
# Dockerコンテナが起動しているか確認
docker ps | grep nomoca-kagawa-admin

# コンテナが起動していない場合は起動
pnpm docker:up

# ローカル環境をセットアップ
pnpm setup:local
```

#### 依存関係が更新された場合

```bash
# Dockerコンテナを再起動
pnpm docker:down
pnpm docker:up

# ローカル環境を再セットアップ
pnpm setup:local
```

### ポート競合エラー

```bash
# 使用中のポートを確認
lsof -i :3001

# プロセスを停止
pnpm stop:all
```

### API接続エラー

```bash
# tamanomi-apiが起動しているか確認
curl http://localhost:3002/health

# APIサーバーを起動
cd ../../tamanomi-api && pnpm dev
```

### Turbopack関連の警告

```bash
# Webpack設定を無効化してTurbopackのみ使用
pnpm dev:no-cache
```

### ビルドエラー

```bash
# キャッシュをクリア
pnpm clean

# 依存関係を再インストール
pnpm install:clean
```

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── admins/            # 管理者管理
│   ├── merchants/         # マーチャント管理
│   ├── stores/            # 店舗管理
│   ├── coupons/           # クーポン管理
│   └── users/             # ユーザー管理
├── components/             # React コンポーネント
│   ├── atoms/             # 原子コンポーネント
│   ├── molecules/         # 分子コンポーネント
│   ├── organisms/          # 有機体コンポーネント
│   └── templates/          # テンプレート
├── contexts/               # React Context
├── hooks/                  # カスタムフック
├── lib/                    # ユーティリティ
└── constants/              # 定数定義
```

## 🎨 UI/UX

- **管理画面デザイン**: ダッシュボード形式の管理画面
- **レスポンシブ**: デスクトップ・タブレット対応
- **アクセシビリティ**: WCAG 2.1準拠
- **パフォーマンス**: Turbopackによる高速ビルド

## 🔧 開発コマンド

### 基本コマンド

```bash
# 開発サーバー起動（Turbopack）
pnpm dev

# キャッシュ無効で起動
pnpm dev:no-cache

# プロダクションビルド
pnpm build

# プロダクションサーバー起動
pnpm start
```

### Docker関連コマンド

```bash
# Dockerコンテナを起動
pnpm docker:up

# Dockerコンテナを停止
pnpm docker:down

# Dockerコンテナのログを表示
pnpm docker:logs
```

### ローカル開発コマンド

```bash
# ローカル開発環境をセットアップ
pnpm setup:local

# リント実行
pnpm lint

# 型チェック
pnpm type-check

# キャッシュクリア
pnpm clean

# 依存関係クリーンインストール
pnpm install:clean

# スキーマ更新（Docker環境）
pnpm schema:update
```

## 📊 管理機能

### ダッシュボード
- システム概要
- 統計情報表示
- 最近のアクティビティ

### 店舗管理
- 店舗一覧・詳細
- 店舗登録・編集
- ジャンル管理
- ステータス管理

### マーチャント管理
- マーチャント一覧・詳細
- マーチャント登録・編集
- ステータス管理

### クーポン管理
- クーポン一覧・詳細
- クーポン作成・編集
- 使用履歴管理

### ユーザー管理
- ユーザー一覧・詳細
- ユーザー編集
- クーポン使用履歴

### 管理者管理
- 管理者一覧・詳細
- 管理者登録・編集
- 権限管理
