import { NextResponse } from 'next/server';

/**
 * キャッシュ無効化ヘッダーを設定したNextResponseを作成
 * 
 * @param data - レスポンスデータ
 * @param init - NextResponseの初期化オプション
 * @returns キャッシュ無効化ヘッダーが設定されたNextResponse
 */
export function createNoCacheResponse(
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(data, init);
  // HSTS: HTTPSの接続を強制（1年間）
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

/**
 * 既存のNextResponseにキャッシュ無効化ヘッダーを追加
 * 
 * @param response - NextResponseインスタンス
 * @returns キャッシュ無効化ヘッダーが設定されたNextResponse
 */
export function addNoCacheHeaders(response: NextResponse): NextResponse {
  // HSTS: HTTPSの接続を強制（1年間）
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}



