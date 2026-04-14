import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_MAX_AGE, COOKIE_NAMES } from '@/lib/cookie-config'

export interface TokenPair {
  accessToken?: string
  refreshToken?: string
}

/**
 * リクエストURLからHTTPS判定を行う
 */
export function isSecureRequest(request: NextRequest): boolean {
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

/**
 * トークンをhttpOnly Cookieに設定する（一元管理）
 *
 * - 旧Cookie（プレフィックス無し）を削除して衝突を解消
 * - 通常Cookie + __Host-プレフィックス付きCookie（HTTPS時のみ）を設定
 * - admin は sameSite: 'lax' を使用（外部からのリダイレクト対応）
 */
export function setTokenCookies(
  response: NextResponse,
  tokens: TokenPair,
  isSecure: boolean
): void {
  if (tokens.accessToken) {
    response.cookies.set('accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 })
    response.cookies.set('__Host-accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 })

    response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
    })
    if (isSecure) {
      response.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
      })
    }
  }

  if (tokens.refreshToken) {
    response.cookies.set('refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 })
    response.cookies.set('__Host-refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 })

    response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
    })
    if (isSecure) {
      response.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, tokens.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
      })
    }
  }
}

/**
 * トークンCookieをすべて削除する（ログアウト用、一元管理）
 */
export function clearTokenCookies(
  response: NextResponse,
  isSecure: boolean
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }

  response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, '', cookieOptions)
  response.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, '', cookieOptions)
  response.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, '', cookieOptions)
  response.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, '', cookieOptions)

  response.cookies.set('accessToken', '', cookieOptions)
  response.cookies.set('__Host-accessToken', '', cookieOptions)
  response.cookies.set('refreshToken', '', cookieOptions)
  response.cookies.set('__Host-refreshToken', '', cookieOptions)
}
