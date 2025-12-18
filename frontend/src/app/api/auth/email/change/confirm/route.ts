import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return createNoCacheResponse({ success: false, error: 'トークンが指定されていません' }, { status: 400 });
    }

    const confirmUrl = `${API_BASE_URL}/email/change/confirm?token=${encodeURIComponent(token)}`;
    
    const response = await secureFetchWithCommonHeaders(request, confirmUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: false, // 確認処理は認証不要
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Email change confirm failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();

    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Email change confirm error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

