# nomoca-kagawa-admin

香川県の飲食店向けサブスクリプションサービス 管理者向けWebアプリケーション - Next.js 15 + TypeScript

## 🚀 特徴

- **Next.js 15**: App Routerを使用したモダンなNext.jsアプリケーション
- **TypeScript**: 型安全性を確保
- **Tailwind CSS v4**: 最新のスタイリング
- **ロールベースアクセス制御**: システム管理者・加盟店管理者の権限管理
- **API統合**: `@hv-development/schemas`パッケージを使用した型安全なAPI通信

## 🛠️ ローカル開発

### 単独での開発サーバー起動

```bash
cd nomoca-kagawa-admin/frontend

# 開発サーバー起動
pnpm dev
# → http://localhost:3001

# Turbo モード（高速ビルド）
pnpm dev:turbo

# 本番ビルド
pnpm build

# バンドル分析付きビルド
pnpm build:analyze

# 本番サーバー起動
pnpm start
```

### コード品質

```bash
# リント実行
pnpm lint

# 型チェック
pnpm type-check
```

## 📦 主な機能

### システム管理者向け機能

- 管理者アカウント管理
- 加盟店管理（登録・編集・承認）
- 店舗管理（一括ステータス変更）
- ユーザー管理
- クーポン管理（作成・編集・公開設定）
- クーポン利用履歴

### 加盟店管理者向け機能

- 自店舗の店舗情報編集
- クーポン管理
- QRコード生成

### 技術スタック

- **フロントエンド**: Next.js 15, React 18, TypeScript
- **スタイリング**: Tailwind CSS v4
- **UIコンポーネント**: Lucide React
- **バリデーション**: Zod
- **認証**: Jose (JWT)

## 🚀 デプロイ (Vercel)

Vercelへのデプロイを推奨します。

### 環境変数

```bash
# API設定
API_BASE_URL=https://your-api-domain.railway.app
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app

# セッション暗号化
SESSION_SECRET=your-secure-session-secret-key-here-min-32-chars
```

## 📝 ライセンス

ISC License
