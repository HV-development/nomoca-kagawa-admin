import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { COOKIE_MAX_AGE, COOKIE_NAMES } from '@/lib/cookie-config';

// 簡易レート制限（同一IPあたり1分間に10回まで）
const ipCounters = new Map<string, { count: number; resetAt: number }>();
function rateLimit(request: Request): boolean {
  try {
    const xf = request.headers.get('x-forwarded-for') || '';
    const ip = (xf.split(',')[0] || '').trim() || 'unknown';
    const now = Date.now();
    const winMs = 60_000;
    const limit = 10;
    const entry = ipCounters.get(ip);
    if (!entry || now > entry.resetAt) {
      ipCounters.set(ip, { count: 1, resetAt: now + winMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  } catch {
    return true;
  }
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  if (!rateLimit(request)) {
    return createNoCacheResponse({ message: 'Too Many Requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const loginUrl = `${API_BASE_URL}/admin/login`;
    
    // 管理者用のログインエンドポイントを使用
    const response = await secureFetchWithCommonHeaders(request, loginUrl, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // ログインは認証不要
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Admin login failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    const isSecure = (() => {
      try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
    })();

    // トークンはhttpOnly Cookieに保存し、ボディでは返却しない
    const res = createNoCacheResponse({ account: data.account });
    if (data.accessToken) {
      // アクセストークン: 30日（バックエンドのJWT_ACCESS_TOKEN_EXPIRES_INのデフォルト値と一致）
      const accessTokenMaxAge = COOKIE_MAX_AGE.ACCESS_TOKEN;
      const accessTokenDays = accessTokenMaxAge / (60 * 60 * 24);
      console.log('🍪 [auth/login] アクセストークンCookie設定:', {
        maxAge: accessTokenMaxAge,
        days: accessTokenDays,
        hours: accessTokenMaxAge / (60 * 60),
        configValue: COOKIE_MAX_AGE.ACCESS_TOKEN,
      });
      
      // 旧Cookie（プレフィックス無し）を削除して衝突を解消
      res.cookies.set('accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
      res.cookies.set('__Host-accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

      res.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, data.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: accessTokenMaxAge,
      });
      // __Host- prefix for hardened cookie (no Domain, path=/, secure required)
      // HTTPS環境でのみ設定（__Host-プレフィックスはSecure属性が必須のため）
      if (isSecure) {
        res.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, data.accessToken, {
          httpOnly: true,
          secure: true, // __Host-プレフィックスは必ずsecure: true
          sameSite: 'lax',
          path: '/',
          maxAge: accessTokenMaxAge,
        });
      }
    }
    if (data.refreshToken) {
      // リフレッシュトークン: 30日（1か月、バックエンドのJWT_REFRESH_TOKEN_EXPIRES_INのデフォルト値と一致）
      const refreshTokenMaxAge = COOKIE_MAX_AGE.REFRESH_TOKEN;
      const refreshTokenDays = refreshTokenMaxAge / (60 * 60 * 24);
      console.log('🍪 [auth/login] リフレッシュトークンCookie設定:', {
        maxAge: refreshTokenMaxAge,
        days: refreshTokenDays,
        hours: refreshTokenMaxAge / (60 * 60),
        configValue: COOKIE_MAX_AGE.REFRESH_TOKEN,
      });
      
      // 旧Cookie（プレフィックス無し）を削除して衝突を解消
      res.cookies.set('refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
      res.cookies.set('__Host-refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

      res.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, data.refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: refreshTokenMaxAge,
      });
      // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
      if (isSecure) {
        res.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, data.refreshToken, {
          httpOnly: true,
          secure: true, // __Host-プレフィックスは必ずsecure: true
          sameSite: 'lax',
          path: '/',
          maxAge: refreshTokenMaxAge,
        });
      }
    }
    return res;
  } catch (error: unknown) {
    console.error('❌ API Route: Admin login error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
