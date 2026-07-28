import { NextRequest } from 'next/server'
import { getAuthHeader, getRefreshToken } from '@/lib/header-utils'
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils'
import { createNoCacheResponse } from '@/lib/response-utils'
import { setTokenCookies, isSecureRequest } from '@/lib/token-cookie'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1'

const TRANSIENT_STATUS = 503
const TRANSIENT_BACKOFFS_MS = [500, 1000, 2000]
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** GET/HEAD/OPTIONS のみ再送安全とみなす（fetchの既定メソッドはGET） */
function isIdempotentMethod(method?: string): boolean {
  return IDEMPOTENT_METHODS.has((method ?? 'GET').toUpperCase())
}

/**
 * 503（DB起動待ち等の一時的エラー）の場合のみ短いバックオフで再試行する。
 * - retry=false（非冪等なPOST等）の場合は再送せず、副作用の二重実行を防ぐ。
 * - ログアウト判定（401/403）には影響しない。
 */
async function fetchWithTransientRetry(
  doFetch: () => Promise<Response>,
  { retry = true }: { retry?: boolean } = {}
): Promise<Response> {
  let response = await doFetch()
  if (!retry) return response
  for (const delay of TRANSIENT_BACKOFFS_MS) {
    if (response.status !== TRANSIENT_STATUS) break
    await new Promise((resolve) => setTimeout(resolve, delay))
    response = await doFetch()
  }
  return response
}

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
  const firstResponse = await fetchWithTransientRetry(
    () =>
      secureFetchWithCommonHeaders(request, url, {
        ...options,
        headerOptions: { requireAuth: true },
      }),
    { retry: isIdempotentMethod(options.method) }
  )

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

  // refresh はリフレッシュトークンを消費するPOSTのため503でも再送しない
  // （消費済みトークンの再送による誤ログアウトを防ぐ）。503時は下で503を返す。
  const refreshResponse = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })

  if (!refreshResponse.ok) {
    const status = refreshResponse.status === 503 ? 503 : 401
    const error =
      status === 503
        ? 'サーバーが混み合っています。しばらくしてから再試行してください。'
        : 'セッションの有効期限が切れました。再度ログインしてください。'
    const res = createNoCacheResponse({ error }, { status })
    return { response: res, refreshed: false }
  }

  const tokens = await refreshResponse.json()

  const newAuthHeader = tokens.accessToken ? `Bearer ${tokens.accessToken}` : getAuthHeader(request)

  // 再送も共通ヘッダー生成を通す。X-App-Domain が無いとAPI側でapplicationIdを解決できない
  const retryResponse = await secureFetchWithCommonHeaders(request, url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(newAuthHeader ? { Authorization: newAuthHeader } : {}),
    },
    headerOptions: { requireAuth: true },
  })

  const retryData = await retryResponse.json().catch(() => ({}))
  const res = createNoCacheResponse(retryData, { status: retryResponse.status })

  const isSecure = isSecureRequest(request)
  setTokenCookies(res, tokens, isSecure)

  return { response: res, refreshed: true }
}
