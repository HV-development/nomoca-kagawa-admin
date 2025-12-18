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
    const { email } = await request.json();

    if (!email) {
      return createNoCacheResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'メールアドレスが必要です' } },
        { status: 400 }
      );
    }

    // バックエンドAPIを呼び出し
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/password/resend-setup-email`, {
      method: 'POST',
      headerOptions: {
        requireAuth: false, // パスワード設定メール再送は認証不要
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: パスワード設定メール再送失敗', {
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
    console.error('❌ API Route: パスワード設定メール再送エラー', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'パスワード設定メールの再送に失敗しました' } },
      { status: 500 }
    );
  }
}
