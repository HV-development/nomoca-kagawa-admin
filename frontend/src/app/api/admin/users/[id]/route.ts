import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { getAuthHeader, getRefreshToken } from '@/lib/header-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { COOKIE_MAX_AGE, COOKIE_NAMES } from '@/lib/cookie-config';

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) {
    return createNoCacheResponse({ message: 'ユーザーIDが指定されていません' }, { status: 400 });
  }

  try {
    let refreshResult: { token: string; refreshToken?: string } | null = null;
    const authHeader = getAuthHeader(request);

    // 認証ヘッダーがない場合、リフレッシュトークンで更新を試行
    if (!authHeader) {
      refreshResult = await refreshAccessToken(request);
      if (!refreshResult) {
        return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const fullUrl = `${API_BASE_URL}/users/${encodeURIComponent(id)}`;

    // リフレッシュされたトークンがある場合はそれを使用、なければ通常の認証ヘッダーを使用
    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: true,
        setContentType: false, // GETリクエストにはボディがないためContent-Typeを設定しない
        customHeaders: refreshResult ? {
          'Authorization': refreshResult.token,
        } : undefined,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json().catch(() => null);
    const nextResponse = createNoCacheResponse(data);

    if (refreshResult) {
      const token = refreshResult.token.replace('Bearer ', '');
      const isSecure = (() => {
        try {
          return new URL(request.url).protocol === 'https:';
        } catch {
          return process.env.NODE_ENV === 'production';
        }
      })();

      // アクセストークン: 2時間（バックエンドのJWT_ACCESS_TOKEN_EXPIRES_INと一致）
      // 旧Cookie（プレフィックス無し）を削除して衝突を解消
      nextResponse.cookies.set('accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
      nextResponse.cookies.set('__Host-accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

      nextResponse.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
      });

      // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
      if (isSecure) {
        nextResponse.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, token, {
          httpOnly: true,
          secure: true, // __Host-プレフィックスは必ずsecure: true
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
        });
      }

      if (refreshResult.refreshToken) {
        // リフレッシュトークン: 7日間（バックエンドのJWT_REFRESH_TOKEN_EXPIRES_INと一致）
        // 旧Cookie（プレフィックス無し）を削除して衝突を解消
        nextResponse.cookies.set('refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
        nextResponse.cookies.set('__Host-refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

        nextResponse.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshResult.refreshToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
        });
        // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
        if (isSecure) {
          nextResponse.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, refreshResult.refreshToken, {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) {
    return createNoCacheResponse({ message: 'ユーザーIDが指定されていません' }, { status: 400 });
  }

  try {
    let refreshResult: { token: string; refreshToken?: string } | null = null;
    const authHeader = getAuthHeader(request);

    // 認証ヘッダーがない場合、リフレッシュトークンで更新を試行
    if (!authHeader) {
      refreshResult = await refreshAccessToken(request);
      if (!refreshResult) {
        return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const fullUrl = `${API_BASE_URL}/users/${encodeURIComponent(id)}`;

    // リフレッシュされたトークンがある場合はそれを使用、なければ通常の認証ヘッダーを使用
    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'PUT',
      headerOptions: {
        requireAuth: true,
        customHeaders: refreshResult ? {
          'Authorization': refreshResult.token,
        } : undefined,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json().catch(() => null);
    const nextResponse = createNoCacheResponse(data);

    if (refreshResult) {
      const token = refreshResult.token.replace('Bearer ', '');
      const isSecure = (() => {
        try {
          return new URL(request.url).protocol === 'https:';
        } catch {
          return process.env.NODE_ENV === 'production';
        }
      })();

      // アクセストークン: 2時間（バックエンドのJWT_ACCESS_TOKEN_EXPIRES_INと一致）
      nextResponse.cookies.set('accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
      nextResponse.cookies.set('__Host-accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

      nextResponse.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
      });

      // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
      if (isSecure) {
        nextResponse.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
        });
      }

      if (refreshResult.refreshToken) {
        // リフレッシュトークン: 7日間（バックエンドのJWT_REFRESH_TOKEN_EXPIRES_INと一致）
        nextResponse.cookies.set('refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
        nextResponse.cookies.set('__Host-refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });

        nextResponse.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshResult.refreshToken, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
        });
        // __Host- prefix for hardened cookie - HTTPS環境でのみ設定
        if (isSecure) {
          nextResponse.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, refreshResult.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
          });
        }
      }
    }

    return nextResponse;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
