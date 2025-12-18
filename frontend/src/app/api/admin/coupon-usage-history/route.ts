import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { getAuthHeader } from '@/lib/header-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

// セキュリティ改善：個人情報をクエリパラメータで送信しないため、POSTメソッドに変更
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthHeader(request);
    if (!auth) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    // セキュリティ改善：個人情報をクエリパラメータで送信しないため、POSTメソッドでボディに含めて送信
    const body = await request.json().catch(() => ({}));
    
    const fullUrl = `${API_BASE_URL}/admin/coupon-usage-history`;

    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
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

    if (!response.ok) {
      let errorData: { message?: string; error?: { message?: string } } | null = null;
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text().catch(() => '');
          errorData = { message: text || `HTTP ${response.status} ${response.statusText}` };
        }
      } catch (e) {
        errorData = { message: `Failed to parse error response: ${e instanceof Error ? e.message : String(e)}` };
      }
      console.error('❌ API Route: Get coupon usage history failed', { 
        status: response.status, 
        statusText: response.statusText,
        contentType,
        error: errorData,
        url: fullUrl,
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Get coupon usage history error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
