import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📧 API Route: Email change request received');
    
    const emailChangeUrl = `${API_BASE_URL}/auth/email/change`;
    console.log('🔗 API Route: Full email change URL:', emailChangeUrl);
    
    const response = await secureFetchWithCommonHeaders(request, emailChangeUrl, {
      method: 'POST',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Email change request failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Email change request successful');

    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Email change error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

