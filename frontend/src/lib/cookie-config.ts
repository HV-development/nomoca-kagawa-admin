/**
 * Cookie名の定義
 * アプリケーション固有のプレフィックスを使用して、
 * 同一ドメインで動作する他のアプリケーションとの競合を防止
 */

// アプリケーション固有のプレフィックス
const APP_PREFIX = 'nomoca_admin_'

// 認証関連のCookie名
export const COOKIE_NAMES = {
  // アクセストークン（開発環境用）
  ACCESS_TOKEN: `${APP_PREFIX}accessToken`,
  // リフレッシュトークン（開発環境用）
  REFRESH_TOKEN: `${APP_PREFIX}refreshToken`,
  // アクセストークン（__Host-プレフィックス付き、HTTPS環境用）
  HOST_ACCESS_TOKEN: `__Host-${APP_PREFIX}accessToken`,
  // リフレッシュトークン（__Host-プレフィックス付き、HTTPS環境用）
  HOST_REFRESH_TOKEN: `__Host-${APP_PREFIX}refreshToken`,
} as const

// Cookie有効期限の設定
// 注意: バックエンドのJWTトークンの有効期限と一致させる必要があります
// バックエンドのデフォルト設定:
// - JWT_ACCESS_TOKEN_EXPIRES_IN: '30d' (30日)
// - JWT_REFRESH_TOKEN_EXPIRES_IN: '30d' (30日)
export const COOKIE_MAX_AGE = {
  // アクセストークン: 30日（1か月）
  ACCESS_TOKEN: 60 * 60 * 24 * 30,
  // リフレッシュトークン: 30日（1か月）
  REFRESH_TOKEN: 60 * 60 * 24 * 30,
} as const




