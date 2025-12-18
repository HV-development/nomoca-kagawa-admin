import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;
    
    if (!token || !password) {
      return createNoCacheResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'トークンとパスワードが必要です' } },
        { status: 400 }
      );
    }

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/password/set-password`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // パスワード設定は認証不要
      },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('❌ API Route: Password setup failed', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorData 
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Password setup error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      API_BASE_URL
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: 'パスワードの設定に失敗しました', 
        details: errorMessage
      }
    }, { status: 500 });
  }
}
