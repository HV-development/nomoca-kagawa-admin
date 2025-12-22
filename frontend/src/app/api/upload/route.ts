import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

// サーバーサイドではDocker内部URLを使用
const API_BASE_URL = process.env.API_BASE_URL 
  ? process.env.API_BASE_URL.replace('/api/v1', '') 
  : 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // #region agent log
    const formDataEntries: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        formDataEntries[key] = `[File: ${value.name}, ${value.type}, ${value.size} bytes]`;
      } else {
        formDataEntries[key] = String(value);
      }
    }
    console.log('📤 [upload/route.ts] FormData received:', JSON.stringify(formDataEntries));
    // #endregion
    
    // 入力検証: 画像のみ、サイズ上限（10MB/ファイル）、最大ファイル数（5）
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    let fileCount = 0;
    for (const [, value] of formData.entries()) {
      if (value instanceof File) {
        fileCount += 1;
        if (fileCount > 5) {
          return createNoCacheResponse({ error: 'ファイル数が多すぎます（最大5件）' }, { status: 400 });
        }
        if (!allowedTypes.has(value.type)) {
          return createNoCacheResponse({ error: '許可されていないファイル形式です' }, { status: 400 });
        }
        if (value.size > MAX_FILE_SIZE) {
          return createNoCacheResponse({ error: 'ファイルサイズが大きすぎます（最大10MB）' }, { status: 400 });
        }
      }
    }
    
    // バックエンドAPIに転送（FormDataの場合はContent-Typeを設定しない）
    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headerOptions: {
        requireAuth: true, // 認証が必要
        setContentType: false, // FormDataの場合はContent-Typeを設定しない
        customHeaders: {
          // Cookieを転送
          ...(request.headers.get('cookie') ? { cookie: request.headers.get('cookie')! } : {}),
        },
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '画像のアップロードに失敗しました' }));
      // #region agent log
      console.log('❌ [upload/route.ts] Backend error:', { status: response.status, errorData });
      // #endregion
      return createNoCacheResponse(
        { error: errorData.message || '画像のアップロードに失敗しました' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // #region agent log
    console.log('✅ [upload/route.ts] Backend success:', data);
    // #endregion
    return createNoCacheResponse(data);
  } catch (error) {
    console.error('Upload API error:', error);
    return createNoCacheResponse(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}
