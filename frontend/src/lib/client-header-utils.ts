/**
 * クライアントサイド用の共通ヘッダー生成ユーティリティ
 * ブラウザからNext.js API Routesへのリクエストで使用する共通ヘッダーを自動生成
 */

export interface ClientHeaderOptions {
  /**
   * 追加のカスタムヘッダー
   */
  customHeaders?: Record<string, string>
  /**
   * Content-Typeを設定するかどうか（デフォルト: true）
   * FormDataを使用する場合はfalseに設定
   */
  setContentType?: boolean
}

/**
 * クライアントサイド用の共通ヘッダーを生成
 * 
 * @param options - ヘッダー生成オプション
 * @returns 共通ヘッダーオブジェクト
 */
export function buildClientHeaders(
  options: ClientHeaderOptions = {}
): Record<string, string> {
  const {
    customHeaders = {},
    setContentType = true,
  } = options

  const headers: Record<string, string> = {}

  // Content-Typeを設定（デフォルトでapplication/json）
  if (setContentType) {
    headers['Content-Type'] = 'application/json'
  }

  // リクエストIDを生成（トレーシング用）
  // ブラウザ環境ではcrypto.randomUUID()を使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    headers['X-Request-ID'] = crypto.randomUUID()
  } else {
    // フォールバック: タイムスタンプベースのID
    headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  // カスタムヘッダーをマージ（後から追加されたヘッダーが優先）
  Object.assign(headers, customHeaders)

  return headers
}

/**
 * FormData用のヘッダーを生成（Content-Typeは設定しない）
 * 
 * @param options - ヘッダー生成オプション
 * @returns ヘッダーオブジェクト
 */
export function buildFormDataHeaders(
  options: Omit<ClientHeaderOptions, 'setContentType'> = {}
): Record<string, string> {
  return buildClientHeaders({
    ...options,
    setContentType: false, // FormDataの場合はContent-Typeを設定しない
  })
}


