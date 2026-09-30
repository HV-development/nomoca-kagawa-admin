import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const shopIds = request.nextUrl.searchParams.get('shopIds') ?? '';
    const response = await secureFetchWithCommonHeaders(
      request,
      `${API_BASE_URL}/shops/referral-counts?shopIds=${encodeURIComponent(shopIds)}`,
      {
        method: 'GET',
        headerOptions: {
          requireAuth: true,
          setContentType: false,
        },
      }
    );

    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await response.json();
    return createNoCacheResponse(data, { status: response.status });
  } catch (error: unknown) {
    console.error('❌ API Route: Get shop referral counts error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
