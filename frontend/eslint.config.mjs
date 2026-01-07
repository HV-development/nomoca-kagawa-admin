// eslint.config.mjs (Flat Config for ESLint v9 + Next.js + TypeScript + React)
import nextPlugin from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'

// sessionStorageの制限ルール
const sessionStorageRestrictions = [
  {
    selector: "MemberExpression[object.name='window'][property.name='sessionStorage']",
    message: 'window.sessionStorageの使用は禁止されています。セキュリティ上の理由により、Cookieベースのセッション管理を使用してください。',
  },
  {
    selector: "MemberExpression[object.name='sessionStorage']",
    message: 'sessionStorageの使用は禁止されています。セキュリティ上の理由により、Cookieベースのセッション管理を使用してください。',
  },
  {
    selector: "CallExpression[callee.object.name='sessionStorage']",
    message: 'sessionStorageのメソッド（getItem、setItem、removeItem、clearなど）の使用は禁止されています。セキュリティ上の理由により、Cookieベースのセッション管理を使用してください。',
  },
  {
    selector: "CallExpression[callee.object.object.name='window'][callee.object.property.name='sessionStorage']",
    message: 'window.sessionStorageのメソッドの使用は禁止されています。セキュリティ上の理由により、Cookieベースのセッション管理を使用してください。',
  },
]

const eslintConfig = [
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'build/', 'next-env.d.ts', 'playwright-report/', 'test-results/'],
  },
  {
    name: 'next/core-web-vitals',
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'sessionStorage',
          message: 'sessionStorageの使用は禁止されています。セキュリティ上の理由により、Cookieベースのセッション管理を使用してください。',
        },
      ],
      'no-restricted-syntax': ['error', ...sessionStorageRestrictions],
    },
  },
  // ページコンポーネントでは一時データ保存用のsessionStorage使用を許可
  // 注意: 認証トークンの保存には絶対に使用しないこと（トーストやフォームデータの一時保存のみ）
  {
    files: ['src/app/**/page.tsx', 'src/components/organisms/ShopForm.tsx'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['src/app/api/**/route.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'APIルートではsecureFetchWithCommonHeadersを使用してください。直接fetch()の使用は禁止されています。',
        },
        {
          selector: "CallExpression[callee.object.name='Response'][callee.property.name='json']",
          message: 'APIルートではcreateNoCacheResponseを使用してください。Response.json()の直接使用は禁止されています。',
        },
        {
          selector: "CallExpression[callee.object.name='NextResponse'][callee.property.name='json']",
          message: 'APIルートではcreateNoCacheResponseを使用してください。NextResponse.json()の直接使用は禁止されています。',
        },
      ],
    },
  },
]

export default eslintConfig
