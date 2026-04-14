import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { clearTokenCookies, isSecureRequest } from '@/lib/token-cookie';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/logout`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false,
        setContentType: false,
      },
    });

    const ok = response.ok;
    const nextResponse = createNoCacheResponse(
      ok ? { message: 'Logout successful' } : { message: 'Logout locally cleared', upstream: response.status }
    );
    const isSecure = isSecureRequest(request);
    clearTokenCookies(nextResponse, isSecure);

    return nextResponse;
  } catch (error: unknown) {
    console.error('❌ API Route: Logout error', error);
    const res = createNoCacheResponse({ message: 'Local logout executed' }, { status: 200 });
    const isSecure = isSecureRequest(request);
    clearTokenCookies(res, isSecure);
    return res;
  }
}
