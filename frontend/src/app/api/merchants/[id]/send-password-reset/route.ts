import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // バックエンドAPIを呼び出し
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin/merchants/${id}/send-password-reset`, {
      method: 'POST',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
      body: JSON.stringify({}), // 空のJSONボディを送信（Fastifyの要件）
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('❌ API Route: パスワード再設定メール送信失敗', {
        status: response.status,
        error: errorData,
      });
      
      return createNoCacheResponse(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();

    return createNoCacheResponse(data);
  } catch (error) {
    console.error('❌ API Route: パスワード再設定メール送信エラー', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'パスワード再設定メールの送信に失敗しました' } },
      { status: 500 }
    );
  }
}
