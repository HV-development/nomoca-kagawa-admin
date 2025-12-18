#!/bin/bash

# nomoca-kagawa-admin 環境セットアップスクリプト
# 
# このスクリプトは以下を実行します:
# 1. .env.exampleから.envファイルを作成
# 2. JWT_SECRETを自動生成して置換
# 3. GITHUB_TOKENを環境変数から設定（存在する場合）
# 4. 依存関係のインストール

set -e

echo "🚀 nomoca-kagawa-admin 環境セットアップ開始..."
echo ""

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📁 プロジェクトルート: $PROJECT_ROOT"
echo "📁 フロントエンドディレクトリ: $FRONTEND_DIR"
echo ""

# フロントエンドディレクトリに移動
cd "$FRONTEND_DIR"

# ===================================
# 1. .envファイルの作成
# ===================================
echo "📝 Step 1: .envファイルの作成"
echo "-----------------------------------"

if [ ! -f ".env.example" ]; then
  echo "❌ .env.exampleファイルが見つかりません"
  exit 1
fi

if [ -f ".env" ]; then
  echo "⚠️  .envファイルが既に存在します"
  read -p "上書きしますか？ (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ セットアップを中断しました"
    exit 1
  fi
fi

cp .env.example .env
echo "✅ .env.exampleから.envを作成しました"
echo ""

# ===================================
# 2. JWT_SECRETの設定（共有環境変数から）
# ===================================
echo "🔐 Step 2: JWT_SECRETの設定"
echo "-----------------------------------"

SHARED_ENV="$PROJECT_ROOT/../.env.shared"

# 共有環境ファイルからJWT_SECRETを読み込む
if [ -f "$SHARED_ENV" ]; then
  SHARED_JWT_SECRET=$(grep "^JWT_SECRET=" "$SHARED_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  
  if [ -n "$SHARED_JWT_SECRET" ]; then
    JWT_SECRET="$SHARED_JWT_SECRET"
    echo "✅ 共有環境ファイルからJWT_SECRETを読み込みました"
    echo "   ファイル: .env.shared"
  else
    echo "⚠️  共有環境ファイルにJWT_SECRETが設定されていません"
    echo ""
    echo "以下のコマンドで共通環境変数をセットアップしてください:"
    echo "   $ cd $REPO_ROOT"
    echo "   $ bash scripts/setup-shared-env.sh"
    echo ""
    exit 1
  fi
else
  echo "⚠️  共有環境ファイルが見つかりません: $SHARED_ENV"
  echo ""
  echo "以下のコマンドで共通環境変数をセットアップしてください:"
  echo "   $ cd $REPO_ROOT"
  echo "   $ bash scripts/setup-shared-env.sh"
  echo ""
  exit 1
fi

# .envファイル内のJWT_SECRETを置換
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
else
  sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
fi

echo "✅ .envファイルにJWT_SECRETを設定しました"
echo "   生成されたキー: ${JWT_SECRET:0:20}...（128文字）"
echo ""

# ===================================
# 3. GITHUB_TOKENの設定
# ===================================
echo "🔑 Step 3: GITHUB_TOKENの設定"
echo "-----------------------------------"

# 共有環境ファイルからGITHUB_TOKENを読み込む（優先）
if [ -f "$SHARED_ENV" ] && [ -z "$GITHUB_TOKEN" ]; then
  SHARED_GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$SHARED_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$SHARED_GITHUB_TOKEN" ]; then
    GITHUB_TOKEN="$SHARED_GITHUB_TOKEN"
    echo "✅ 共有環境ファイルからGITHUB_TOKENを読み込みました"
  fi
fi

# .envファイルからGITHUB_TOKENを読み込む（フォールバック）
if [ -f ".env" ] && [ -z "$GITHUB_TOKEN" ]; then
  EXISTING_TOKEN=$(grep "^GITHUB_TOKEN=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  if [ -n "$EXISTING_TOKEN" ] && [ "$EXISTING_TOKEN" != "your_github_token_here" ]; then
    GITHUB_TOKEN="$EXISTING_TOKEN"
    echo "✅ .envファイルから既存のGITHUB_TOKENを読み込みました"
  fi
fi

if [ -n "$GITHUB_TOKEN" ]; then
  if [ -z "$EXISTING_TOKEN" ]; then
    echo "✅ 環境変数からGITHUB_TOKENを取得しました"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${GITHUB_TOKEN}/" .env
    else
      sed -i "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${GITHUB_TOKEN}/" .env
    fi
    echo "✅ .envファイルにGITHUB_TOKENを設定しました"
  fi
else
  echo "⚠️  環境変数GITHUB_TOKENが設定されていません"
  echo ""
  
  # GitHub CLIがインストールされているかチェック
  if command -v gh &> /dev/null; then
    echo "📦 GitHub CLIが見つかりました"
    echo ""
    echo "以下の方法でGITHUB_TOKENを取得できます:"
    echo "1. GitHub CLIで自動取得（推奨）"
    echo "2. 手動で入力"
    echo "3. スキップ"
    echo ""
    read -p "選択してください (1/2/3): " choice
    
    case $choice in
      1)
        echo ""
        echo "🔐 GitHub CLIを使用してトークンを取得しています..."
        
        # 新しいトークンを作成
        echo "🔧 新しいPersonal Access Tokenを作成しています..."
        
        # リポジトリ名を取得（例: tamanomi-admin-dev）
        REPO_NAME=$(basename "$PROJECT_ROOT")
        TOKEN_NAME="${REPO_NAME}-dev"
        
        echo "   トークン名: $TOKEN_NAME"
        echo "   スコープ: read:packages"
        echo ""
        
        # ブラウザでトークン作成ページを開く
        echo "🌐 ブラウザでトークン作成ページを開きます..."
        TOKEN_URL="https://github.com/settings/tokens/new?scopes=read:packages&description=${TOKEN_NAME}"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
          open "$TOKEN_URL"
        else
          xdg-open "$TOKEN_URL" 2>/dev/null
        fi
        
        echo "✅ ブラウザでトークン作成ページを開きました"
        echo ""
        echo "📝 作成手順:"
        echo "   1. Note: '$TOKEN_NAME' (既に入力済み)"
        echo "   2. Expiration: 適切な期限を選択（推奨: 90日）"
        echo "   3. Select scopes: 'read:packages' (既にチェック済み)"
        echo "   4. 'Generate token' をクリック"
        echo "   5. 生成されたトークンをコピー"
        echo ""
        
        read -p "生成されたGITHUB_TOKENを入力してください: " input_token
        ;;
      2)
        echo ""
        echo "GitHub Personal Access Tokenを作成してください:"
        echo ""
        echo "1. https://github.com/settings/tokens にアクセス"
        echo "2. 'Generate new token' → 'Generate new token (classic)' をクリック"
        echo "3. Note: 'nomoca-kagawa-development' など分かりやすい名前"
        echo "4. Expiration: 適切な期限を選択（推奨: 90日）"
        echo "5. Scopes: 'read:packages' にチェック"
        echo "6. 'Generate token' をクリックしてトークンをコピー"
        echo ""
        
        # ブラウザで開くか確認
        if command -v open &> /dev/null || command -v xdg-open &> /dev/null; then
          read -p "ブラウザでトークン作成ページを開きますか？ (y/N): " -n 1 -r
          echo
          if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
              open "https://github.com/settings/tokens/new?scopes=read:packages&description=nomoca-kagawa-development"
            else
              xdg-open "https://github.com/settings/tokens/new?scopes=read:packages&description=nomoca-kagawa-development" 2>/dev/null
            fi
            echo "✅ ブラウザでトークン作成ページを開きました"
          fi
        fi
        
        echo ""
        read -p "GITHUB_TOKENを入力してください: " input_token
        ;;
      3)
        echo "⚠️  GITHUB_TOKENの設定をスキップしました"
        input_token=""
        ;;
      *)
        echo "❌ 無効な選択です。スキップします。"
        input_token=""
        ;;
    esac
  else
    echo "💡 GitHub CLIがインストールされていません"
    echo ""
    echo "GitHub CLIをインストールすると、トークンの取得が簡単になります:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "  brew install gh"
    else
      echo "  詳細: https://cli.github.com/manual/installation"
    fi
    echo ""
    echo "または、手動でGitHub Personal Access Tokenを作成してください:"
    echo ""
    echo "1. https://github.com/settings/tokens にアクセス"
    echo "2. 'Generate new token' → 'Generate new token (classic)' をクリック"
    echo "3. Note: 'tamanomi-development' など分かりやすい名前"
    echo "4. Expiration: 適切な期限を選択（推奨: 90日）"
    echo "5. Scopes: 'read:packages' にチェック"
    echo "6. 'Generate token' をクリックしてトークンをコピー"
    echo ""
    
    # ブラウザで開くか確認
    if command -v open &> /dev/null || command -v xdg-open &> /dev/null; then
      read -p "ブラウザでトークン作成ページを開きますか？ (y/N): " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
          open "https://github.com/settings/tokens/new?scopes=read:packages&description=tamanomi-development"
        else
          xdg-open "https://github.com/settings/tokens/new?scopes=read:packages&description=tamanomi-development" 2>/dev/null
        fi
        echo "✅ ブラウザでトークン作成ページを開きました"
      fi
    fi
    
    echo ""
    read -p "GITHUB_TOKENを入力してください (スキップする場合はEnter): " input_token
  fi
  
  if [ -n "$input_token" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${input_token}/" .env
    else
      sed -i "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=${input_token}/" .env
    fi
    echo "✅ .envファイルにGITHUB_TOKENを設定しました"
    
    # 環境変数としても設定
    export GITHUB_TOKEN="$input_token"
    echo "✅ 現在のセッションの環境変数にもGITHUB_TOKENを設定しました"
  else
    echo "⚠️  GITHUB_TOKENはスキップされました"
    echo "   後で手動で.envファイルに設定してください"
  fi
fi
echo ""

# ===================================
# 4. .npmrcの設定確認
# ===================================
echo "📦 Step 4: .npmrcの設定確認"
echo "-----------------------------------"

if [ -f ".npmrc" ]; then
  echo "✅ .npmrcファイルが存在します"
  
  # GITHUB_TOKENが設定されている場合、.npmrcに認証情報を追加
  if [ -n "$GITHUB_TOKEN" ] || [ -n "$input_token" ]; then
    if ! grep -q "//npm.pkg.github.com/:_authToken" .npmrc; then
      echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc
      echo "✅ .npmrcにGitHub Package Registry認証設定を追加しました"
    else
      echo "✅ .npmrcに既に認証設定があります"
    fi
  fi
else
  echo "⚠️  .npmrcファイルが見つかりません"
fi
echo ""

# ===================================
# 5. Docker用のシンボリックリンク作成
# ===================================
echo "🔗 Step 5: Docker用のシンボリックリンク作成"
echo "-----------------------------------"

DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
DOCKER_ENV_LINK="$DOCKER_DIR/.env"

if [ -d "$DOCKER_DIR" ]; then
  # 既存のファイル/リンクを確認
  if [ -L "$DOCKER_ENV_LINK" ]; then
    echo "✅ シンボリックリンクが既に存在します"
    echo "   $(ls -l "$DOCKER_ENV_LINK")"
  elif [ -f "$DOCKER_ENV_LINK" ]; then
    echo "⚠️  $DOCKER_ENV_LINK に通常ファイルが存在します"
    echo "🗑️  バックアップしてシンボリックリンクに置き換えます..."
    mv "$DOCKER_ENV_LINK" "$DOCKER_ENV_LINK.backup.$(date +%Y%m%d_%H%M%S)"
    ln -s ../../frontend/.env "$DOCKER_ENV_LINK"
    echo "✅ シンボリックリンクを作成しました"
  else
    ln -s ../../frontend/.env "$DOCKER_ENV_LINK"
    echo "✅ シンボリックリンクを作成しました"
    echo "   $DOCKER_ENV_LINK -> ../../frontend/.env"
  fi
else
  echo "⚠️  infrastructure/dockerディレクトリが見つかりません"
  echo "   シンボリックリンクの作成をスキップします"
fi
echo ""

# ===================================
# 6. 依存関係のインストール
# ===================================
echo "📦 Step 6: 依存関係のインストール"
echo "-----------------------------------"

if [ -n "$GITHUB_TOKEN" ] || [ -n "$input_token" ]; then
  echo "pnpm install を実行します..."
  pnpm install
  echo "✅ 依存関係のインストールが完了しました"
else
  echo "⚠️  GITHUB_TOKENが設定されていないため、インストールをスキップします"
  echo "   GITHUB_TOKENを設定後、手動で 'pnpm install' を実行してください"
fi
echo ""

# ===================================
# 7. Dockerイメージのビルド
# ===================================
echo "🐳 Step 7: Dockerイメージのビルド"
echo "-----------------------------------"

if [ -n "$GITHUB_TOKEN" ] || [ -n "$input_token" ]; then
  if [ -d "$DOCKER_DIR" ]; then
    echo "Dockerイメージをビルドします..."
    echo "   ディレクトリ: $DOCKER_DIR"
    echo ""
    
    cd "$DOCKER_DIR"
    docker-compose build
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Dockerイメージのビルドが完了しました"
    else
      echo ""
      echo "❌ Dockerイメージのビルドに失敗しました"
      echo "   エラーを確認して、再度ビルドしてください:"
      echo "   $ cd $DOCKER_DIR"
      echo "   $ docker-compose build"
    fi
    
    cd "$FRONTEND_DIR"
  else
    echo "⚠️  infrastructure/dockerディレクトリが見つかりません"
    echo "   Dockerイメージのビルドをスキップします"
  fi
else
  echo "⚠️  GITHUB_TOKENが設定されていないため、ビルドをスキップします"
  echo "   GITHUB_TOKENを設定後、手動でビルドしてください:"
  echo "   $ cd $DOCKER_DIR"
  echo "   $ docker-compose build"
fi
echo ""

# ===================================
# 完了
# ===================================
echo "🎉 環境セットアップが完了しました！"
echo ""
echo "📝 次のステップ:"
echo "   1. .envファイルの内容を確認してください"
echo "      $ cat .env"
echo ""
echo "   2. GITHUB_TOKENを設定していない場合は、.envファイルに追加してください"
echo ""
echo "   3. 開発サーバーを起動してください"
echo "      $ cd $FRONTEND_DIR"
echo "      $ pnpm dev"
echo ""
echo "   4. Docker環境で起動する場合:"
echo "      $ cd $PROJECT_ROOT/infrastructure/docker"
echo "      $ docker-compose up --build"
echo ""
echo "💡 Tips:"
echo "   - JWT_SECRETを再生成: pnpm secret:generate"
echo "   - 環境変数の確認: cat .env"
echo "   - GitHub Token: https://github.com/settings/tokens"
echo "   - Docker用.envはシンボリックリンクで自動同期されます"
echo ""

