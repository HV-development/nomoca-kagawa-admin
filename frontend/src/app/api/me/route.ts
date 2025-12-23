import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    // バックエンドの統合エンドポイントにプロキシ
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/me`, {
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
      const error = await response.json().catch(() => ({}));
      return createNoCacheResponse(
        { message: error.error?.message || error.message || 'Failed to fetch account info' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error) {
    console.error('Error in /api/me:', error);
    return createNoCacheResponse(
      { 
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
