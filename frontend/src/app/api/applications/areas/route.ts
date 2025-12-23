import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

/**
 * 現在のアプリケーションのエリア一覧を取得
 * X-App-Domainヘッダーからアプリケーションを判定
 */
export async function GET(request: NextRequest) {
  try {
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/public/applications/areas`, {
      method: 'GET',
      headerOptions: {
        requireAuth: false, // 公開API
        setContentType: false, // GETリクエストにはボディがないためContent-Typeを設定しない
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Application areas failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Application areas error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

