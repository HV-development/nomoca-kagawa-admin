import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const fullUrl = `${API_BASE_URL}/admin/plans`;

    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: true,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error) {
    console.error('プラン一覧取得に失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch plans' } },
      { status: 500 }
    );
  }
}
