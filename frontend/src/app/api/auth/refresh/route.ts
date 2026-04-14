import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { getRefreshToken } from '@/lib/header-utils';
import { setTokenCookies, isSecureRequest } from '@/lib/token-cookie';

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
    const refreshToken = getRefreshToken(request);
    if (!refreshToken) {
      console.warn('🔄 No refresh token cookie');
      return createNoCacheResponse({ message: 'No refresh token' }, { status: 401 });
    }
    
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/refresh`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false,
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

    const res = createNoCacheResponse({ ok: true });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Pragma', 'no-cache');

    const isSecure = isSecureRequest(request);
    setTokenCookies(res, data, isSecure);

    return res;
  } catch (error: unknown) {
    console.error('❌ API Route: Refresh token error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
