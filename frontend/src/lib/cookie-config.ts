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

/**
 * 時間文字列（'30d', '7d'など）を秒数に変換
 * @param timeString 時間文字列（例: '30d', '7d', '24h', '60m'）
 * @returns 秒数
 */
function parseTimeStringToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([dhms])$/);
  if (!match) {
    console.warn(`⚠️ Invalid time string format: ${timeString}, using default 30 days`);
    return 60 * 60 * 24 * 30; // デフォルト: 30日
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': // 日
      return value * 24 * 60 * 60;
    case 'h': // 時間
      return value * 60 * 60;
    case 'm': // 分
      return value * 60;
    case 's': // 秒
      return value;
    default:
      console.warn(`⚠️ Unknown time unit: ${unit}, using default 30 days`);
      return 60 * 60 * 24 * 30;
  }
}

/**
 * 環境変数からトークン有効期限を取得（秒数）
 * バックエンドと同じ環境変数名を使用
 */
const getTokenExpirationSeconds = (envVar: string | undefined, defaultValue: string): number => {
  const timeString = envVar || defaultValue;
  return parseTimeStringToSeconds(timeString);
};

// Cookie有効期限の設定
// 注意: バックエンドのJWTトークンの有効期限と一致させる必要があります
// バックエンドと同じ環境変数を使用:
// - JWT_ACCESS_TOKEN_EXPIRES_IN: '30d' (30日) または環境変数で指定
// - JWT_REFRESH_TOKEN_EXPIRES_IN: '30d' (30日) または環境変数で指定
export const COOKIE_MAX_AGE = {
  // アクセストークン: 環境変数から取得、デフォルト30日
  ACCESS_TOKEN: getTokenExpirationSeconds(
    process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    '30d'
  ),
  // リフレッシュトークン: 環境変数から取得、デフォルト30日
  REFRESH_TOKEN: getTokenExpirationSeconds(
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    '30d'
  ),
} as const




