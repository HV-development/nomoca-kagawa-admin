import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 API Route: Logout request received');
    
    // ログアウトは認証がオプショナル（認証されていない場合でもログアウト処理を実行）
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/logout`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // 認証がオプショナル
      },
    });

    const ok = response.ok;
    const nextResponse = createNoCacheResponse(
      ok ? { message: 'Logout successful' } : { message: 'Logout locally cleared', upstream: response.status }
    );
    const isSecure = (() => {
      try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
    })();
    
    // accessToken クッキーを削除
    nextResponse.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    nextResponse.cookies.set('__Host-accessToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    // refreshToken クッキーを削除
    nextResponse.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    nextResponse.cookies.set('__Host-refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    console.log('🍪 API Route: Session cookies cleared');
    return nextResponse;
  } catch (error: unknown) {
    console.error('❌ API Route: Logout error', error);
    const res = createNoCacheResponse({ message: 'Local logout executed' }, { status: 200 });
    const isSecure = (() => {
      try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
    })();
    res.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    res.cookies.set('__Host-accessToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    res.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    res.cookies.set('__Host-refreshToken', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  }
}
