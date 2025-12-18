/**
 * サーバーサイド用の共通ヘッダー生成ユーティリティ
 * Next.js API Routesで使用する共通ヘッダーを自動生成
 */

import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export interface HeaderOptions {
  /**
   * 認証が必要かどうか（デフォルト: true）
   * falseの場合、認証ヘッダーは設定されない
   */
  requireAuth?: boolean
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
 * Requestからリフレッシュトークンを取得
 * Cookieから取得し、なければnullを返す
 */
export function getRefreshToken(request: NextRequest | Request): string | null {
  // NextRequestのcookies APIから取得を試みる
  if ('cookies' in request && request.cookies) {
    const refreshTokenCookie = request.cookies.get('refreshToken') || request.cookies.get('__Host-refreshToken');
    if (refreshTokenCookie?.value) {
      return refreshTokenCookie.value;
    }
  }

  // Cookieヘッダーから取得（フォールバック）
  const cookieHeader = request.headers.get('cookie') || '';
  const pairs = cookieHeader.split(';').map(v => v.trim());
  const refreshPair = pairs.find(v => v.startsWith('refreshToken=')) || pairs.find(v => v.startsWith('__Host-refreshToken='));
  const refreshToken = refreshPair ? decodeURIComponent(refreshPair.split('=')[1] || '') : '';
  
  return refreshToken || null;
}

/**
 * Requestからアクセストークンを取得してAuthorizationヘッダーを返す
 * 
 * @param request - NextRequestまたはRequestオブジェクト
 * @returns Authorizationヘッダーの値（Bearerトークンなど）、またはnull
 */
export function getAuthHeader(request: NextRequest | Request): string | null {
  // まずAuthorizationヘッダーをチェック
  const headerToken = request.headers.get('authorization')
  if (headerToken) {
    return headerToken
  }

  // NextRequestのcookies APIから取得を試みる
  if ('cookies' in request && request.cookies) {
    // __Host-プレフィックス付きのCookieを優先的にチェック
    const hostAccessTokenCookie = request.cookies.get('__Host-accessToken')
    if (hostAccessTokenCookie?.value) {
      return `Bearer ${hostAccessTokenCookie.value}`
    }
    
    const accessTokenCookie = request.cookies.get('accessToken')
    if (accessTokenCookie?.value) {
      return `Bearer ${accessTokenCookie.value}`
    }
  }

  // Cookieヘッダーから取得（フォールバック）
  const cookieHeader = request.headers.get('cookie') || ''
  const pairs = cookieHeader.split(';').map(v => v.trim())
  // __Host-プレフィックス付きのCookieを優先的にチェック
  const hostAccessPair = pairs.find(v => v.startsWith('__Host-accessToken='))
  if (hostAccessPair) {
    const accessToken = decodeURIComponent(hostAccessPair.split('=')[1] || '')
    if (accessToken) {
      return `Bearer ${accessToken}`
    }
  }
  
  const accessPair = pairs.find(v => v.startsWith('accessToken='))
  const accessToken = accessPair ? decodeURIComponent(accessPair.split('=')[1] || '') : ''
  
  return accessToken ? `Bearer ${accessToken}` : null
}

/**
 * 共通ヘッダーを生成
 * 
 * @param request - NextRequestまたはRequestオブジェクト
 * @param options - ヘッダー生成オプション
 * @returns 共通ヘッダーオブジェクト
 */
export function buildCommonHeaders(
  request: NextRequest | Request,
  options: HeaderOptions = {}
): Record<string, string> {
  const {
    requireAuth = true,
    customHeaders = {},
    setContentType = true,
  } = options

  const headers: Record<string, string> = {}

  // Content-Typeを設定（デフォルトでapplication/json）
  if (setContentType) {
    headers['Content-Type'] = 'application/json'
  }

  // 認証ヘッダーを設定
  if (requireAuth) {
    const authHeader = getAuthHeader(request)
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
  }

  // リクエストIDを生成（トレーシング用）
  const requestId = randomUUID()
  headers['X-Request-ID'] = requestId

  // X-Forwarded-Hostヘッダーを追加（バックエンドでのアプリケーション判定用）
  // 環境変数 APP_DOMAIN が設定されている場合はそれを優先使用
  // これにより、Vercel/Railway経由でも正しい管理画面ドメインが転送される
  const appDomain = process.env.APP_DOMAIN
  if (appDomain) {
    headers['X-Forwarded-Host'] = appDomain
  } else {
    // フォールバック: 実際のリクエストのHostヘッダーを転送
    const host = request.headers.get('host')
    if (host) {
      headers['X-Forwarded-Host'] = host
    }
  }

  // カスタムヘッダーをマージ（後から追加されたヘッダーが優先）
  Object.assign(headers, customHeaders)

  return headers
}

/**
 * 認証不要の共通ヘッダーを生成
 * 
 * @param request - NextRequestまたはRequestオブジェクト
 * @param options - ヘッダー生成オプション
 * @returns 共通ヘッダーオブジェクト
 */
export function buildCommonHeadersWithoutAuth(
  request: NextRequest | Request,
  options: Omit<HeaderOptions, 'requireAuth'> = {}
): Record<string, string> {
  return buildCommonHeaders(request, {
    ...options,
    requireAuth: false,
  })
}


