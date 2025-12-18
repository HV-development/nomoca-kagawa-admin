# Next.jsアプリケーション用Dockerfile
FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Dependencies
FROM base AS deps
# ビルド引数としてGitHub tokenを受け取る
ARG GITHUB_TOKEN
WORKDIR /app
RUN node -v && npm -v
COPY nomoca-kagawa-admin/frontend/package.json nomoca-kagawa-admin/frontend/pnpm-lock.yaml ./
COPY nomoca-kagawa-admin/frontend/.npmrc ./

# ビルド時にGitHub tokenを設定（トークンが提供された場合のみ）
RUN if [ -z "$GITHUB_TOKEN" ]; then \
      echo "エラー: GITHUB_TOKENが設定されていません。ビルドを中止します。" >&2; \
      exit 1; \
    else \
      echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc; \
    fi
# Install dependencies from GitHub Packages
RUN pnpm install
# トークンを含む.npmrcを削除（セキュリティのため）
RUN rm -f .npmrc

# Development
FROM base AS dev
WORKDIR /app
# ソースコードをコピー（node_modulesは除外される）
COPY nomoca-kagawa-admin/frontend/ .
# 既存のnode_modules/@hv-development/schemasを削除してから、depsステージからnode_modulesをコピー
RUN rm -rf node_modules/@hv-development/schemas 2>/dev/null || true
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["pnpm", "run", "dev"]