import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

// モックの設定
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('/api/me endpoint - プロキシパターン', () => {
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

  /**
   * リクエストオブジェクトを作成
   */
  const createRequest = (token?: string) => {
    const headers = new Headers();
    if (token) {
      headers.set('cookie', `accessToken=${encodeURIComponent(token)}`);
    }
    return new Request('http://localhost:3000/api/me', {
      method: 'GET',
      headers,
    });
  };

  describe('✅ 正常系: バックエンドへのプロキシ', () => {
    it('admin アカウント情報を正しく取得できる', async () => {
      const backendResponse = {
        accountType: 'admin',
        email: 'admin@example.com',
        role: 'operator',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => backendResponse,
    });

      const request = createRequest('valid-jwt-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accountType).toBe('admin');
      expect(data.role).toBe('operator');
      expect(data.email).toBe('admin@example.com');
      
      // バックエンドAPIが正しく呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-jwt-token',
          }),
        })
      );
    });

    it('merchant アカウント情報を正しく取得できる', async () => {
      const backendResponse = {
        accountType: 'merchant',
        email: 'merchant@example.com',
        merchantId: 'merchant-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => backendResponse,
    });

      const request = createRequest('valid-jwt-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accountType).toBe('merchant');
      expect(data.merchantId).toBe('merchant-123');
    });

    it('shop アカウント情報を正しく取得できる', async () => {
      const backendResponse = {
        accountType: 'shop',
        email: 'shop@example.com',
        shopId: 'shop-456',
        merchantId: 'merchant-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => backendResponse,
    });

      const request = createRequest('valid-jwt-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accountType).toBe('shop');
      expect(data.shopId).toBe('shop-456');
      expect(data.merchantId).toBe('merchant-123');
    });
    });

  describe('🚨 異常系: バックエンドエラーのハンドリング', () => {
    it('トークンなしの場合は401を返す', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
      
      // バックエンドAPIは呼ばれない
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('APIの「無効なトークンです」は401に揃える（リフレッシュの対象にする）', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: '無効なトークンです' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = createRequest('expired-token');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('権限不足の403はそのまま返す', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'この事業者へのアクセス権限がありません' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = createRequest('valid-token');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it('バックエンドが403を返した場合（無効なトークン）', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
        }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = createRequest('invalid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toContain('Invalid or expired token');
    });

    it('バックエンドが404を返した場合', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: 'NOT_FOUND', message: 'Account not found' }
        }),
    });

      const request = createRequest('valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toContain('Account not found');
    });

    it('バックエンドが500エラーを返した場合', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
        }),
    });

      const request = createRequest('valid-token');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it('ネットワークエラーが発生した場合', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = createRequest('valid-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Internal Server Error');
      expect(data.error).toBe('Network error');
    });
    });

  describe('🔐 セキュリティ: JWT検証はバックエンドで実施', () => {
    it('偽造されたJWTはバックエンドで検出される', async () => {
      // フロントエンドは単純にトークンを転送するだけ
      // バックエンドが403を返すことを確認
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
        }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));

      const forgedToken = 'eyJhbGciOiJIUzI1NiJ9.fake.payload';
      const request = createRequest(forgedToken);
      const response = await GET(request);

      expect(response.status).toBe(403);
      
      // フロントエンドはトークンをそのまま転送
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${forgedToken}`,
          }),
        })
      );
    });

    it('改竄されたペイロードはバックエンドで拒否される', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
          error: { message: 'Invalid or expired token' }
        }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }));

      const tamperedToken = 'header.tamperedPayload.signature';
      const request = createRequest(tamperedToken);
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
    });

  describe('📦 レスポンスヘッダー', () => {
    it('キャッシュ無効化ヘッダーが設定される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accountType: 'admin',
          email: 'admin@example.com',
        }),
    });

      const request = createRequest('valid-token');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Pragma')).toBe('no-cache');
    });
    });

  describe('🍪 Cookie処理', () => {
    it('__Host-付きのアクセストークンCookieから取得できる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accountType: 'admin' }),
    });

      const headers = new Headers();
      headers.set('cookie', '__Host-nomoca_admin_accessToken=my-token-value');
      const request = new Request('http://localhost:3000/api/me', {
        method: 'GET',
        headers,
    });

      await GET(request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-token-value',
          }),
        })
      );
    });

    it('通常Cookieのアクセストークンが優先される', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accountType: 'admin' }),
    });

      const headers = new Headers();
      headers.set('cookie', 'nomoca_admin_accessToken=token1; __Host-nomoca_admin_accessToken=token2');
      const request = new Request('http://localhost:3000/api/me', {
        method: 'GET',
        headers,
    });

      await GET(request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token1',
          }),
        })
      );
    });
    });
    });
