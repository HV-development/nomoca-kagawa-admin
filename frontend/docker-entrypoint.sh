#!/bin/sh
set -e

echo "🚀 Starting Admin app setup..."

# GITHUB_TOKENが設定されていれば.npmrcに認証情報を追加
if [ -n "$GITHUB_TOKEN" ]; then
  echo "🔑 Setting up npm authentication..."
  echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
fi

# package.jsonの変更を検出して必要に応じて再インストール
PACKAGE_JSON_HASH=""
HASH_FILE="/tmp/package_json_hash.txt"

if [ -f "package.json" ]; then
  PACKAGE_JSON_HASH=$(md5sum package.json | cut -d' ' -f1)
fi

# node_modulesが存在しない、またはpackage.jsonが変更された場合にインストール
if [ ! -d "node_modules/next" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat $HASH_FILE 2>/dev/null)" != "$PACKAGE_JSON_HASH" ]; then
  echo "📦 Installing dependencies..."
  pnpm install --prefer-offline 2>/dev/null || pnpm install
  echo "$PACKAGE_JSON_HASH" > "$HASH_FILE"
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed (skipping)"
fi

# schemas のビルドとコピー（ローカル開発用）
if [ -d "/app/tamanomi-schemas" ]; then
  echo "🔨 Building tamanomi-schemas from local..."
  cd /app/tamanomi-schemas
  if [ ! -d "node_modules" ]; then
    pnpm install --prefer-offline 2>/dev/null || pnpm install
  fi
  if [ ! -d "dist" ] || [ "package.json" -nt "dist/index.js" ]; then
    pnpm run build
  fi
  
  echo "📋 Copying schemas to node_modules..."
  cd /app
  mkdir -p /app/node_modules/@hv-development/schemas
  cp -r /app/tamanomi-schemas/dist /app/node_modules/@hv-development/schemas/
  cp /app/tamanomi-schemas/package.json /app/node_modules/@hv-development/schemas/
  echo "✅ Schemas built and copied from local"
fi

echo "🎉 Setup complete! Starting application..."
exec "$@"
