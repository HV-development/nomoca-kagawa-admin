import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 API Route: Bulk shop status update request received', { 
      shopIds: body.shopIds, 
      status: body.status 
    });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/shops/bulk-status`, {
      method: 'PATCH',
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
      console.error('❌ API Route: Bulk shop status update failed', { 
        status: response.status, 
        error: errorData 
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Bulk shop status update successful', { 
      updatedCount: data.data?.updatedCount,
      failedCount: data.data?.failedCount
    });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Bulk shop status update error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ 
      message: 'Internal Server Error', 
      error: errorMessage 
    }, { status: 500 });
  }
}
