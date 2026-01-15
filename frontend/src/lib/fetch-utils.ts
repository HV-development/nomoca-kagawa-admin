/**
 * fetch呼び出し用の共通ユーティリティ
 * キャッシュ無効化とセキュリティ設定を統一
 */

import { NextRequest } from 'next/server'
import { buildCommonHeaders, type HeaderOptions } from './header-utils'

/**
 * セキュアなfetch呼び出しのデフォルトオプション
 * - cache: 'no-store' - ブラウザのHTTPキャッシュを無効化
 * - credentials: 'include' - Cookieを含める（必要に応じて）
 */
export const defaultFetchOptions: RequestInit = {
  cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
};

/**
 * fetch呼び出しのヘルパー関数
 * デフォルトでキャッシュ無効化を適用
 * 
 * @param url - リクエストURL
 * @param options - fetchオプション（デフォルトオプションとマージされる）
 * @returns fetchレスポンス
 */
export async function secureFetch(
  url: string | URL,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...defaultFetchOptions,
    ...options,
    // オプションで上書きされた場合でも、cacheは常にno-storeを維持
    cache: 'no-store',
  });
}

/**
 * 認証ヘッダー付きのfetch呼び出し
 * 
 * @param url - リクエストURL
 * @param authHeader - Authorizationヘッダーの値（Bearerトークンなど）
 * @param options - 追加のfetchオプション
 * @returns fetchレスポンス
 */
export async function secureFetchWithAuth(
  url: string | URL,
  authHeader: string,
  options: RequestInit = {}
): Promise<Response> {
  return secureFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
}

/**
 * 共通ヘッダーを自動設定するfetch呼び出し
 * NextRequestから自動的に共通ヘッダーを生成して設定
 * 
 * @param request - NextRequestオブジェクト
 * @param url - リクエストURL
 * @param options - fetchオプションとヘッダー生成オプション
 * @returns fetchレスポンス
 */
export async function secureFetchWithCommonHeaders(
  request: NextRequest,
  url: string | URL,
  options: RequestInit & { headerOptions?: HeaderOptions } = {}
): Promise<Response> {
  const { headerOptions, ...fetchOptions } = options

  // ボディの有無に応じてContent-Typeを自動設定（明示指定がある場合はそれを優先）
  const hasBody = typeof fetchOptions.body !== 'undefined' && fetchOptions.body !== null
  const effectiveHeaderOptions: HeaderOptions = {
    ...headerOptions,
    setContentType: headerOptions?.setContentType ?? hasBody,
  }

  // 共通ヘッダーを生成
  const commonHeaders = buildCommonHeaders(request, effectiveHeaderOptions)
  
  // 既存のヘッダーとマージ（options.headersが優先）
  const headers = {
    ...commonHeaders,
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }

  return secureFetch(url, {
    ...fetchOptions,
    headers,
  });
}



