import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { getRefreshToken } from '@/lib/header-utils';
import { COOKIE_MAX_AGE, COOKIE_NAMES } from '@/lib/cookie-config';

// 簡易レート制限（同一IPあたり1分間に20回まで）
const ipCounters = new Map<string, { count: number; resetAt: number }>();
function rateLimit(request: Request): boolean {
  try {
    const xf = request.headers.get('x-forwarded-for') || '';
    const ip = (xf.split(',')[0] || '').trim() || 'unknown';
    const now = Date.now();
    const winMs = 60_000;
    const limit = 20;
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
    // __Host-refreshToken と refreshToken の両方を探す
    const refreshToken = getRefreshToken(request);
    if (!refreshToken) {
      console.warn('🔄 No refresh token cookie');
      return createNoCacheResponse({ message: 'No refresh token' }, { status: 401 });
    }
    
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/refresh`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // リフレッシュトークンは認証不要
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Refresh token failed', {
        status: response.status,
        error: errorData,
        hasRefreshCookie: true,
        host: request.headers.get('host'),
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    const isSecure = (() => {
      try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
    })();

    const res = createNoCacheResponse({ ok: true });
    if (data.accessToken) {
      // アクセストークン: 環境変数JWT_ACCESS_TOKEN_EXPIRES_INから取得（cookie-config.tsで一元管理）
      const accessTokenMaxAge = COOKIE_MAX_AGE.ACCESS_TOKEN;
      const accessTokenDays = accessTokenMaxAge / (60 * 60 * 24);
      console.log('🍪 [auth/refresh] アクセストークンCookie設定:', {
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
      // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
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
      // リフレッシュトークン: 環境変数JWT_REFRESH_TOKEN_EXPIRES_INから取得（cookie-config.tsで一元管理）
      const refreshTokenMaxAge = COOKIE_MAX_AGE.REFRESH_TOKEN;
      const refreshTokenDays = refreshTokenMaxAge / (60 * 60 * 24);
      console.log('🍪 [auth/refresh] リフレッシュトークンCookie設定:', {
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
    console.error('❌ API Route: Refresh token error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
