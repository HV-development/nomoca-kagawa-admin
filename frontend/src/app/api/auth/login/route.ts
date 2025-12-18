import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

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
    console.log('🔐 API Route: Admin login request received', { email: body.email });
    console.log('🔗 API Route: API_BASE_URL:', API_BASE_URL);
    const loginUrl = `${API_BASE_URL}/admin/login`;
    console.log('🔗 API Route: Full login URL:', loginUrl);
    console.log('🔐 API Route: Host header', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    
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
    console.log('✅ API Route: Admin login successful', { accountType: data.account?.accountType });

    // トークンはhttpOnly Cookieに保存し、ボディでは返却しない
    const res = createNoCacheResponse({ account: data.account });
    if (data.accessToken) {
      res.cookies.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
      });
      // __Host- prefix for hardened cookie (no Domain, path=/, secure required)
      res.cookies.set('__Host-accessToken', data.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
      });
      console.info('🔐 API Route: Set access token cookies', {
        isSecure,
        sameSite: 'lax',
      });
    }
    if (data.refreshToken) {
      res.cookies.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      res.cookies.set('__Host-refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      console.info('🔐 API Route: Set refresh token cookies', {
        isSecure,
        sameSite: 'lax',
        maxAgeDays: 30,
      });
    }
    return res;
  } catch (error: unknown) {
    console.error('❌ API Route: Admin login error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
