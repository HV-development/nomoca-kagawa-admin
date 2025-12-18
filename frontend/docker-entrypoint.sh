#!/bin/sh
set -e

echo "🚀 Starting Admin app setup..."

# package.jsonの変更を検出して必要に応じて再インストール
PACKAGE_JSON_HASH=""
HASH_FILE="/tmp/package_json_hash.txt"

if [ -f "package.json" ]; then
  PACKAGE_JSON_HASH=$(md5sum package.json | cut -d' ' -f1)
fi

# node_modulesが存在しない、またはpackage.jsonが変更された場合にインストール
if [ ! -d "node_modules/next" ] || [ ! -f "$HASH_FILE" ] || [ "$(cat $HASH_FILE 2>/dev/null)" != "$PACKAGE_JSON_HASH" ]; then
  echo "📦 Installing dependencies..."
  pnpm install --prefer-offline
  echo "$PACKAGE_JSON_HASH" > "$HASH_FILE"
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed (skipping)"
fi

# schemas のビルド（初回のみ）
if [ ! -d "node_modules/@hv-development/schemas/dist" ]; then
  echo "🔨 Building tamanomi-schemas..."
  cd /app/tamanomi-schemas
  if [ ! -d "node_modules" ]; then
    pnpm install --prefer-offline
  fi
  pnpm run build
  
  echo "📋 Copying schemas to node_modules..."
  cd /app
  mkdir -p /app/node_modules/@hv-development/schemas
  cp -r /app/tamanomi-schemas/dist /app/node_modules/@hv-development/schemas/
  cp /app/tamanomi-schemas/package.json /app/node_modules/@hv-development/schemas/
  echo "✅ Schemas built and copied"
else
  echo "✅ Schemas already built (skipping)"
fi

echo "🎉 Setup complete! Starting application..."
exec "$@"

