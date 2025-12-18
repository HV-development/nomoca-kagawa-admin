import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

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
    console.log('🔄 API Route: Refresh token request received');
    console.log('🔄 API Route: Host header', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    const cookieHeader = request.headers.get('cookie') || '';
    const refreshPair = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith('refreshToken='));
    const refreshToken = refreshPair ? decodeURIComponent(refreshPair.split('=')[1] || '') : '';
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
      console.error('❌ API Route: Refresh token failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    const isSecure = (() => {
      try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
    })();
    console.log('✅ API Route: Refresh token successful');

    const res = createNoCacheResponse({ ok: true });
    if (data.accessToken) {
      res.cookies.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
      });
      res.cookies.set('__Host-accessToken', data.accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
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
    }
    return res;
  } catch (error: unknown) {
    console.error('❌ API Route: Refresh token error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
