import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // 全てのクエリパラメータをそのまま転送
    const queryParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });

    const fullUrl = `${API_BASE_URL}/admin-accounts?${queryParams.toString()}`;

    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Get admin accounts failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Get admin accounts error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin-accounts`, {
      method: 'POST',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
      body: JSON.stringify(body),
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: admin account creation failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: admin account creation error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: '内部サーバーエラー', error: errorMessage }, { status: 500 });
  }
}
