import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 API Route: アカウント発行リクエスト受信');
    
    const body = await request.json();
    console.log('🎫 API Route: Request body', body);
    
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants/issue-accounts`, {
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

    console.log('📡 API Route: Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('❌ API Route: アカウント発行失敗', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: アカウント発行成功', data);
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: アカウント発行エラー', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      API_BASE_URL
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'アカウント発行に失敗しました',
        details: errorMessage
      }
    }, { status: 500 });
  }
}
