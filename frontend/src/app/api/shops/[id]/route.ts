import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';
import { getRefreshToken } from '@/lib/header-utils';
import { COOKIE_MAX_AGE, COOKIE_NAMES } from '@/lib/cookie-config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/shops/${id}`, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
        setContentType: false, // GETリクエストにはボディがないためContent-Typeを設定しない
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Get shop failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: Get shop  error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/shops/${id}`, {
      method: 'PATCH',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
      body: JSON.stringify(body),
    });

    // 401/403エラーの場合、リフレッシュトークンで再試行を試みる
    if (response.status === 401 || response.status === 403) {
      const refreshToken = getRefreshToken(request);
      
      if (refreshToken) {
        // リフレッシュトークンでトークン更新
        const refreshResponse = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/refresh`, {
          method: 'POST',
          headerOptions: {
            requireAuth: false,
          },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          // リフレッシュ成功、新しいトークンで元のリクエストを再試行
          const newAuthHeader = `Bearer ${refreshData.accessToken}`;
          const retryResponse = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/shops/${id}`, {
            method: 'PATCH',
            headerOptions: {
              requireAuth: true,
              customHeaders: {
                'Authorization': newAuthHeader,
              },
            },
            body: JSON.stringify(body),
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            // リフレッシュされたトークンをCookieに反映
            const res = createNoCacheResponse(retryData, { status: 200 });
            const isSecure = (() => {
              try { return new URL(request.url).protocol === 'https:'; } catch { return process.env.NODE_ENV === 'production'; }
            })();
            
            // 新しいトークンをCookieに設定
            if (refreshData.accessToken) {
              res.cookies.set('accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
              res.cookies.set('__Host-accessToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
              res.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, refreshData.accessToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
              });
              if (isSecure) {
                res.cookies.set(COOKIE_NAMES.HOST_ACCESS_TOKEN, refreshData.accessToken, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'lax',
                  path: '/',
                  maxAge: COOKIE_MAX_AGE.ACCESS_TOKEN,
                });
              }
            }
            if (refreshData.refreshToken) {
              res.cookies.set('refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
              res.cookies.set('__Host-refreshToken', '', { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 0 });
              res.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshData.refreshToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
              });
              if (isSecure) {
                res.cookies.set(COOKIE_NAMES.HOST_REFRESH_TOKEN, refreshData.refreshToken, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'lax',
                  path: '/',
                  maxAge: COOKIE_MAX_AGE.REFRESH_TOKEN,
                });
              }
            }
            
            return res;
          } else {
            const retryErrorData = await retryResponse.json().catch(() => ({}));
            console.error('❌ API Route: Update shop retry failed', { status: retryResponse.status, error: retryErrorData });
            return createNoCacheResponse(retryErrorData, { status: retryResponse.status });
          }
        }
      }
      
      // リフレッシュに失敗した場合は認証エラーを返す
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Update shop failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: Update shop error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/shops/${id}`, {
      method: 'DELETE',
      headerOptions: {
        requireAuth: true, // 認証が必要
        setContentType: false, // DELETEリクエストにはボディがないためContent-Typeを設定しない
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Delete shop failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    return createNoCacheResponse({ message: '店舗が削除されました' });
  } catch (error: unknown) {
    console.error(`❌ API Route: Delete shop error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
