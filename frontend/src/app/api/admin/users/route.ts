import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { getRefreshToken, getAuthHeader } from '@/lib/header-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { COOKIE_MAX_AGE } from '@/lib/cookie-config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

async function refreshAccessToken(request: NextRequest): Promise<{ token: string; refreshToken?: string } | null> {
  try {
    const refreshToken = getRefreshToken(request);
    
    if (!refreshToken) {
      return null;
    }

    const refreshResponse = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/refresh`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // リフレッシュトークンは認証不要
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      return null;
    }

    const refreshData = await refreshResponse.json();
    if (!refreshData.accessToken) {
      return null;
    }
    
    return {
      token: `Bearer ${refreshData.accessToken}`,
      refreshToken: refreshData.refreshToken,
    };
  } catch {
    return null;
  }
}

// セキュリティ改善：個人情報をクエリパラメータで送信しないため、POSTメソッドに変更
export async function POST(request: NextRequest) {
  try {
    let refreshResult: { token: string; refreshToken?: string } | null = null;
    const authHeader = getAuthHeader(request);
    
    // accessTokenがない場合はrefreshTokenでリフレッシュを試みる
    if (!authHeader) {
      refreshResult = await refreshAccessToken(request);
      if (!refreshResult) {
        const cookies = request.headers.get('cookie');
        console.error('❌ API Route: No auth header found and refresh failed', { 
          hasCookies: !!cookies,
          cookies: cookies ? cookies.substring(0, 100) : 'none'
        });
        return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    // セキュリティ改善：個人情報をクエリパラメータで送信しないため、POSTメソッドでボディに含めて送信
    const body = await request.json().catch(() => ({}));
    
    // アプリケーションフィルタリングはバックエンドでX-Forwarded-Hostから自動判定
    
    const fullUrl = `${API_BASE_URL}/admin/users`;

    // リフレッシュされたトークンがある場合はそれを使用、なければ通常の認証ヘッダーを使用
    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'POST',
      headerOptions: {
        requireAuth: true,
        customHeaders: refreshResult ? {
          'Authorization': refreshResult.token,
        } : undefined,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Get users failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    
    const nextResponse = createNoCacheResponse(data);
    
    // リフレッシュした場合はCookieを設定
    if (refreshResult) {
      const token = refreshResult.token.replace('Bearer ', '');
      const isSecure = (() => {
        try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
      })();
      
      // アクセストークン: 2時間（バックエンドのJWT_ACCESS_TOKEN_EXPIRES_INと一致）
      nextResponse.cookies.set('accessToken', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
      });
      // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
      if (isSecure) {
        nextResponse.cookies.set('__Host-accessToken', token, {
          httpOnly: true,
          secure: true, // __Host-プレフィックスは必ずsecure: true
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
        });
      }
      
      if (refreshResult.refreshToken) {
        // リフレッシュトークン: 7日間（バックエンドのJWT_REFRESH_TOKEN_EXPIRES_INと一致）
        nextResponse.cookies.set('refreshToken', refreshResult.refreshToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
        });
        // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
        if (isSecure) {
          nextResponse.cookies.set('__Host-refreshToken', refreshResult.refreshToken, {
            httpOnly: true,
            secure: true, // __Host-プレフィックスは必ずsecure: true
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
          });
        }
      }
    }
    
    return nextResponse;
  } catch (error: unknown) {
    console.error('❌ API Route: Get users error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
