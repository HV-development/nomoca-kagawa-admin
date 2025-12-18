import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('🎟️ API Route: Get coupon request received', { couponId: id });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/coupons/${id}`, {
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
      console.error('❌ API Route: Get coupon failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Get coupon successful', { couponId: id });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: Get coupon error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('✏️ API Route: Update coupon request received', { couponId: id, title: body.title });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/coupons/${id}`, {
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
      const errorData = await response.json().catch(() => ({ message: 'クーポンの更新に失敗しました' }));
      console.error('❌ API Route: Update coupon failed', { 
        status: response.status, 
        couponId: id,
        error: errorData 
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Update coupon successful', { couponId: id });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: Update coupon error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('🗑️ API Route: Delete coupon request received', { couponId: id });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/coupons/${id}`, {
      method: 'DELETE',
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
      console.error('❌ API Route: Delete coupon failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    console.log('✅ API Route: Delete coupon successful', { couponId: id });
    return createNoCacheResponse({ message: 'クーポンが削除されました' });
  } catch (error: unknown) {
    console.error(`❌ API Route: Delete coupon error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
