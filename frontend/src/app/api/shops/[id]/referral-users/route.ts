import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const page = request.nextUrl.searchParams.get('page') ?? '1';
    const limit = request.nextUrl.searchParams.get('limit') ?? '50';
    const response = await secureFetchWithCommonHeaders(
      request,
      `${API_BASE_URL}/shops/${encodeURIComponent(id)}/referral-users?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
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
    console.error('❌ API Route: Get shop referral users error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
