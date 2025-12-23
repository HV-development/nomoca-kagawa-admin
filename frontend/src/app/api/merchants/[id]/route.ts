import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants/${id}`, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
        setContentType: false, // GETリクエストにはボディがないためContent-Typeを設定しない
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: 事業者詳細取得失敗', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: 事業者詳細取得エラー `, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: '内部サーバーエラー', error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants/${id}`, {
      method: 'PUT',
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
      console.error('❌ API Route: 事業者更新失敗', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: 事業者更新エラー`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: '内部サーバーエラー', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants/${id}`, {
      method: 'DELETE',
      headerOptions: {
        requireAuth: true, // 認証が必要
        setContentType: false, // DELETEリクエストにはボディがないためContent-Typeを設定しない
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: 事業者削除失敗', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    return createNoCacheResponse({ message: '事業者が削除されました' });
  } catch (error: unknown) {
    console.error(`❌ API Route: 事業者削除エラー`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: '内部サーバーエラー', error: errorMessage }, { status: 500 });
  }
}
