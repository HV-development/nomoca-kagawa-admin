import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    console.log('🎟️ API Route: Get coupons request received', {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    
    const url = new URL(request.url);
    
    // 全てのクエリパラメータをそのまま転送
    const queryParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      queryParams.append(key, value);
    });
    
    // デフォルト値の設定
    if (!queryParams.has('page')) queryParams.append('page', '1');
    if (!queryParams.has('limit')) queryParams.append('limit', '10');
    
    // アプリケーションフィルタリングはバックエンドでX-Forwarded-Hostから自動判定
    
    const fullUrl = `${API_BASE_URL}/coupons?${queryParams.toString()}`;
    console.log('🔗 API Route: Fetching from', fullUrl);

    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Get coupons failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Get coupons successful', { count: data.coupons?.length || 0 });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Get coupons error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('➕ API Route: Create coupon request received', { title: body.title });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/coupons`, {
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
      const errorData = await response.json();
      console.error('❌ API Route: Create coupon failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Create coupon successful', { couponId: data.id });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Create coupon error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
