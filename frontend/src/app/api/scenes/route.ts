import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

// 動的レンダリングを強制（静的生成を無効化）
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🎭 Next.js API Route: GET /api/scenes');
  
  try {
    const url = `${API_BASE_URL}/scenes`;
    console.log('📤 Forwarding to:', url);

    const response = await secureFetchWithCommonHeaders(request, url, {
      method: 'GET',
      headerOptions: {
        requireAuth: false, // 利用シーン一覧は認証不要（公開エンドポイント）
      },
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return createNoCacheResponse(
        { error: '利用シーンの取得に失敗しました' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully fetched scenes');
    return createNoCacheResponse(data);
  } catch (error) {
    console.error('❌ Error fetching scenes:', error);
    return createNoCacheResponse(
      { error: '利用シーンの取得に失敗しました' },
      { status: 500 }
    );
  }
}
