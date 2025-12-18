import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    // URLからクエリパラメータを取得
    const url = new URL(request.url);
    const queryParams = new URLSearchParams(url.search);
    
    // アプリケーションフィルタリングはバックエンドでX-Forwarded-Hostから自動判定
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    console.log('🌐 API Route: 事業者一覧取得リクエスト受信');
    console.log('🔗 API Route: API_BASE_URL:', API_BASE_URL);
    console.log('🔍 API Route: Query params:', queryString);
    console.log('🔗 API Route: Full URL:', `${API_BASE_URL}/admin/merchants${queryString}`);
    
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants${queryString}`, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('📡 API Route: Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('❌ API Route: 事業者一覧取得失敗', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorData 
      });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('🔍 API Route: APIサーバーからの生レスポンス', { 
      responseStatus: response.status,
      dataType: typeof data,
      dataKeys: Object.keys(data),
      merchantsCount: data.data?.merchants?.length || data.merchants?.length || 0,
      firstMerchant: data.data?.merchants?.[0] || data.merchants?.[0] || null
    });
    console.log('✅ API Route: 事業者一覧取得成功', { 
      count: data.merchants?.length || data.length,
      dataStructure: Object.keys(data),
      merchantsStructure: data.merchants ? Object.keys(data.merchants[0] || {}) : 'no merchants',
      fullResponse: JSON.stringify(data, null, 2)
    });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: 事業者一覧取得エラー', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      API_BASE_URL
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ 
      message: '内部サーバーエラー', 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('➕ API Route: 事業者作成リクエスト受信', { 
      name: body.name,
      fullBody: body,
      bodyKeys: Object.keys(body)
    });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants`, {
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
      console.error('❌ API Route: 事業者作成失敗', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: 事業者作成成功', { merchantId: data.id });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: 事業者作成エラー', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: '内部サーバーエラー', error: errorMessage }, { status: 500 });
  }
}
