/**
 * Password Verify Token API Route テスト
 * セキュリティ機能とレスポンスフィルタリングの動作を検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('/api/password/verify-token endpoint', () => {
  const API_BASE_URL = 'http://localhost:3002/api/v1';
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    process.env.API_BASE_URL = API_BASE_URL;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  function createRequest(token: string | null): Request {
    const url = token 
      ? `http://localhost:3000/api/password/verify-token?token=${token}`
      : 'http://localhost:3000/api/password/verify-token';
    return new NextRequest(url);
  }

  describe('正常系: トークン検証成功', () => {
    it('正常なトークンで検証成功し、フィルタリングされたレスポンスを返す', async () => {
      const mockResponse = {
        data: {
          valid: true,
          accountType: 'merchant',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
    });

      const request = createRequest('valid-token-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: {
          valid: true,
          accountType: 'merchant',
        },
    });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/password/verify-token?token=valid-token-123`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('バックエンドがメールアドレスを含むレスポンスを返しても、フィルタリングで除外される', async () => {
      // バックエンドが誤ってメールアドレスを含む場合（実際には発生しないはずだが防御的）
      const mockResponseWithEmail = {
        data: {
          valid: true,
          accountType: 'merchant',
          email: 'test@example.com', // 漏洩してはいけない情報
          displayName: 'Test User',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponseWithEmail,
    });

      const request = createRequest('valid-token-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // メールアドレスとdisplayNameが除外されていることを確認
      expect(data).toEqual({
        data: {
          valid: true,
          accountType: 'merchant',
        },
    });
      expect(data.data).not.toHaveProperty('email');
      expect(data.data).not.toHaveProperty('displayName');
    });

    it('accountTypeがない場合でもvalidのみを返す', async () => {
      const mockResponse = {
        data: {
          valid: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
    });

      const request = createRequest('valid-token-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: {
          valid: true,
        },
    });
      expect(data.data).not.toHaveProperty('accountType');
    });
    });

  describe('異常系: トークン検証失敗', () => {
    it('無効なトークンでエラーレスポンスを返し、フィルタリングされる', async () => {
      const mockErrorResponse = {
        error: {
          code: 'INVALID_TOKEN',
          message: 'トークンが無効または期限切れです',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
    });

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'トークンが無効または期限切れです',
        },
    });
    });

    it('バックエンドがメールアドレスを含むエラーレスポンスを返しても、フィルタリングで除外される', async () => {
      const mockErrorResponseWithEmail = {
        error: {
          code: 'INVALID_TOKEN',
          message: 'トークンが無効または期限切れです',
          email: 'test@example.com', // 漏洩してはいけない情報
          accountId: '12345',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponseWithEmail,
    });

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // メールアドレスとaccountIdが除外されていることを確認
      expect(data).toEqual({
        error: {
          code: 'INVALID_TOKEN',
          message: 'トークンが無効または期限切れです',
        },
    });
      expect(data.error).not.toHaveProperty('email');
      expect(data.error).not.toHaveProperty('accountId');
    });

    it('バリデーションエラーの場合、detailsを含める', async () => {
      const mockValidationError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'トークンが正しくありません',
          details: [
            { field: 'token', message: 'トークンは必須です' },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockValidationError,
    });

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'トークンが正しくありません',
          details: [
            { field: 'token', message: 'トークンは必須です' },
          ],
        },
    });
    });
    });

  describe('バリデーション: リクエストパラメータ', () => {
    it('トークンがない場合は400エラーを返す', async () => {
      const request = createRequest(null);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'トークンが正しくありません',
        },
    });

      // バックエンドへのリクエストは送信されない
      expect(mockFetch).not.toHaveBeenCalled();
    });
    });

  describe('エラーハンドリング', () => {
    it('予期しないレスポンス形式の場合、500エラーを返す', async () => {
      // 不正な形式のレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalidFormat: true }), // dataフィールドがない
    });

      const request = createRequest('valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'トークンの検証に失敗しました',
        },
    });
    });

    it('ネットワークエラーの場合、500エラーを返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = createRequest('valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'トークンの検証に失敗しました',
        },
    });
    });

    it('JSON解析エラーの場合、適切に処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => {
          throw new Error('Invalid JSON');
        },
    });

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      // フィルタリング関数が安全にデフォルトエラーを返す
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
    });
    });

  describe('セキュリティ検証', () => {
    it('全ての成功レスポンスから個人情報が除外される', async () => {
      const personalInfoResponse = {
        data: {
          valid: true,
          accountType: 'merchant',
          email: 'user@example.com',
          displayName: 'John Doe',
          accountId: '12345',
          phone: '090-1234-5678',
          address: 'Tokyo',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => personalInfoResponse,
    });

      const request = createRequest('valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 許可されたフィールドのみが含まれている
      expect(Object.keys(data.data)).toEqual(['valid', 'accountType']);
      expect(data.data).not.toHaveProperty('email');
      expect(data.data).not.toHaveProperty('displayName');
      expect(data.data).not.toHaveProperty('accountId');
      expect(data.data).not.toHaveProperty('phone');
      expect(data.data).not.toHaveProperty('address');
    });

    it('全てのエラーレスポンスから個人情報が除外される', async () => {
      const personalInfoError = {
        error: {
          code: 'INVALID_TOKEN',
          message: 'エラーが発生しました',
          email: 'user@example.com',
          userId: '12345',
          phone: '090-1234-5678',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => personalInfoError,
    });

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // 許可されたフィールドのみが含まれている
      expect(Object.keys(data.error)).toEqual(['code', 'message']);
      expect(data.error).not.toHaveProperty('email');
      expect(data.error).not.toHaveProperty('userId');
      expect(data.error).not.toHaveProperty('phone');
    });
    });
    });
