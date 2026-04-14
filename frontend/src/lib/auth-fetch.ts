import { NextRequest } from 'next/server'
import { getAuthHeader, getRefreshToken } from '@/lib/header-utils'
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils'
import { createNoCacheResponse } from '@/lib/response-utils'
import { setTokenCookies, isSecureRequest } from '@/lib/token-cookie'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1'

interface AuthenticatedFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

/**
 * 認証付きfetch + 自動リフレッシュ
 *
 * 1. アクセストークンで元のリクエストを送信
 * 2. 401/403 → リフレッシュトークンで新トークンを取得
 * 3. 新トークンで再リクエスト
 * 4. レスポンスに新トークンのSet-Cookieを付与
 */
export async function authenticatedFetch(
  request: NextRequest,
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<{ response: import('next/server').NextResponse; refreshed: boolean }> {
  const firstResponse = await secureFetchWithCommonHeaders(request, url, {
    ...options,
    headerOptions: { requireAuth: true },
  })

  if (firstResponse.ok) {
    const data = await firstResponse.json()
    const res = createNoCacheResponse(data, { status: firstResponse.status })
    return { response: res, refreshed: false }
  }

  if (firstResponse.status !== 401 && firstResponse.status !== 403) {
    const data = await firstResponse.json().catch(() => ({}))
    const res = createNoCacheResponse(data, { status: firstResponse.status })
    return { response: res, refreshed: false }
  }

  const refreshToken = getRefreshToken(request)
  if (!refreshToken) {
    const res = createNoCacheResponse(
      { error: '認証が必要です' },
      { status: 401 }
    )
    return { response: res, refreshed: false }
  }

  const refreshResponse = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })

  if (!refreshResponse.ok) {
    const res = createNoCacheResponse(
      { error: 'セッションの有効期限が切れました。再度ログインしてください。' },
      { status: 401 }
    )
    return { response: res, refreshed: false }
  }

  const tokens = await refreshResponse.json()

  const newAuthHeader = tokens.accessToken ? `Bearer ${tokens.accessToken}` : getAuthHeader(request)

  const retryHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (newAuthHeader) {
    retryHeaders['Authorization'] = newAuthHeader
  }

  const retryResponse = await fetch(url, {
    ...options,
    headers: retryHeaders,
    cache: 'no-store',
  })

  const retryData = await retryResponse.json().catch(() => ({}))
  const res = createNoCacheResponse(retryData, { status: retryResponse.status })

  const isSecure = isSecureRequest(request)
  setTokenCookies(res, tokens, isSecure)

  return { response: res, refreshed: true }
}
