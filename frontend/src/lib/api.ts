// APIクライアント - Next.js APIルート経由
import {
  type AdminLoginInput,
  type AdminRegisterInput,
  type RefreshTokenInput,
  type AdminAccountInput,
} from '@hv-development/schemas';
import { buildClientHeaders } from './client-header-utils';

type RegisterInput = AdminRegisterInput;

// 認証レスポンスの型定義
interface AuthResponse {
  account: {
    email: string;
    accountType: string;
    status: string;
    displayName?: string;
  };
  accessToken: string;
  refreshToken: string;
}

type RefreshResponse = {
  token: string;
  accessToken: string;
  refreshToken: string;
};

const API_BASE_URL = '/api';

type LoginRequest = AdminLoginInput;
type LoginResponse = AuthResponse;
type RegisterRequest = RegisterInput;
type RegisterResponse = AuthResponse;
type RefreshRequest = RefreshTokenInput;

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipAuthRedirect?: boolean } = {}
  ): Promise<T> {
    const { skipAuthRedirect, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const isFormData = typeof fetchOptions.body !== 'undefined' && fetchOptions.body instanceof FormData;
      const hasBody = typeof fetchOptions.body !== 'undefined';

      // 共通ヘッダーを生成（FormDataの場合はContent-Typeを設定しない）
      const commonHeaders = buildClientHeaders({
        setContentType: hasBody && !isFormData,
      });

      const headers: Record<string, string> = {
        ...commonHeaders,
        ...(fetchOptions.headers as Record<string, string> | undefined),
      };

      let response: Response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          credentials: 'include',
          headers,
          cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
        });
      } catch (fetchError) {
        // ネットワークエラーやタイムアウトなどの場合
        const networkError = fetchError instanceof Error
          ? fetchError.message
          : 'Network error occurred';
        throw new Error(`ネットワークエラー: ${networkError}`);
      }

      if (!response.ok) {
        // 405エラー（Method Not Allowed）の場合は特別なメッセージを設定
        const isMethodNotAllowed = response.status === 405;
        let errorData: { message?: string; error?: { message?: string } } = {
          message: isMethodNotAllowed
            ? `HTTP ${response.status}: Method Not Allowed - このエンドポイントは${fetchOptions.method || 'GET'}メソッドをサポートしていません`
            : `HTTP error! status: ${response.status}`,
          error: {
            message: isMethodNotAllowed
              ? 'Method Not Allowed - リクエストメソッドが正しくありません'
              : `Failed to parse error response (status: ${response.status})`
          }
        };

        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            if (text) {
              errorData = { message: text, error: { message: text } };
            }
          }
        } catch (parseError) {
          // JSONパースに失敗した場合は、ステータスコードとステータステキストを使用
          const parseErrorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse error response';
          errorData = {
            message: `HTTP error! status: ${response.status} ${response.statusText || ''} - ${parseErrorMessage}`,
            error: { message: parseErrorMessage }
          };
        }

        // 401/403エラー（認証エラー）の場合の処理
        if ((response.status === 401 || response.status === 403) && !skipAuthRedirect) {
          // リフレッシュトークンで自動更新を試行
          try {
            // ログイン直後の場合、Cookieが設定されるまで少し待機
            await new Promise(resolve => setTimeout(resolve, 200));

            await this.refreshToken();

            // リフレッシュ成功後、Cookieが反映されるまで少し待機
            await new Promise(resolve => setTimeout(resolve, 100));

            // リフレッシュ成功後、元のリクエストを再実行
            const retryResponse = await fetch(url, {
              ...fetchOptions,
              credentials: 'include',
              headers,
              cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
            });

            if (!retryResponse.ok) {
              // リトライが失敗した場合、もう一度待機して再試行
              if (retryResponse.status === 401 || retryResponse.status === 403) {
                await new Promise(resolve => setTimeout(resolve, 300));

                const secondRetryResponse = await fetch(url, {
                  ...fetchOptions,
                  credentials: 'include',
                  headers,
                  cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
                });

                if (!secondRetryResponse.ok) {
                  throw new Error(`Retry failed with status: ${secondRetryResponse.status}`);
                }

                return await secondRetryResponse.json();
              }

              throw new Error(`Retry failed with status: ${retryResponse.status}`);
            }

            return await retryResponse.json();
          } catch (_refreshError) {
            // リフレッシュに失敗した場合はログイン画面へリダイレクト
            if (typeof window !== 'undefined') {
              window.location.href = '/login?session=expired';
            }
            // ここで握りつぶすと呼び出し元が永遠に待つため、明示的に失敗させる
            throw new Error('Unauthorized');
          }
        }

        // エラーオブジェクトを作成して投げる
        // エラーメッセージを複数のパターンから抽出
        let errorMessage = `HTTP error! status: ${response.status}`;

        // エラーメッセージの抽出を試みる
        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object') {
            // messageプロパティを優先的に使用
            if (errorData.message && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else if (errorData.error && typeof errorData.error === 'object' && errorData.error.message) {
              errorMessage = String(errorData.error.message);
            } else {
              // オブジェクトの場合は、可能な限りメッセージを抽出
              try {
                const errorStr = JSON.stringify(errorData);
                if (errorStr && errorStr !== '{}' && errorStr.length > 2) {
                  errorMessage = `HTTP ${response.status}: ${errorStr.substring(0, 200)}`;
                }
              } catch {
                // JSON.stringifyに失敗した場合はデフォルトメッセージを使用
              }
            }
          }
        }

        // エラーメッセージが空またはデフォルトのままの場合は、ステータステキストを追加
        if (errorMessage === `HTTP error! status: ${response.status}` && response.statusText) {
          errorMessage = `${errorMessage} ${response.statusText}`;
        }

        const error = new Error(errorMessage);
        (error as Error & { response?: { status: number; data: unknown } }).response = {
          status: response.status,
          data: errorData
        };
        throw error;
      }

      // レスポンスのJSONパース
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          // JSONでない場合はテキストとして取得
          const text = await response.text();
          // 空の場合は空オブジェクトを返す
          if (!text.trim()) {
            return {} as T;
          }
          // テキストをJSONとしてパースを試みる
          try {
            return JSON.parse(text) as T;
          } catch {
            // パースに失敗した場合はテキストをメッセージとして返す
            throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
          }
        }
      } catch (jsonError) {
        // JSONパースに失敗した場合
        if (jsonError instanceof Error && jsonError.message.includes('Invalid JSON response')) {
          throw jsonError;
        }
        const text = await response.text().catch(() => '');
        const errorMessage = jsonError instanceof Error ? jsonError.message : 'JSON parse error';
        throw new Error(`Failed to parse response as JSON: ${errorMessage}${text ? ` (Response: ${text.substring(0, 100)})` : ''}`);
      }
    } catch (error) {
      // エラーが既にErrorオブジェクトの場合はそのまま投げる
      if (error instanceof Error) {
        // エラーメッセージが空の場合はデフォルトメッセージを使用
        if (!error.message || error.message.trim() === '') {
          throw new Error('API request failed: Unknown error');
        }
        throw error;
      }
      // それ以外の場合はErrorオブジェクトに変換
      const errorMessage = String(error);
      throw new Error(errorMessage || 'API request failed: Unknown error');
    }
  }

  // 認証関連
  async getMe(): Promise<unknown> {
    // ログイン画面等で401になっても自動リフレッシュしない
    return this.request<unknown>('/me', { method: 'GET', skipAuthRedirect: true });
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuthRedirect: true, // ログイン時は自動リダイレクトを無効にする
    });
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      skipAuthRedirect: true, // 登録時は自動リダイレクトを無効にする
    });
  }

  async refreshToken(_refreshData?: RefreshRequest): Promise<RefreshResponse | void> {
    try {
      const response = await this.request<RefreshResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        skipAuthRedirect: true, // トークンリフレッシュ時は自動リダイレクトを無効にする
      });

      return response;
    } catch (_error) {
      // 失敗を握りつぶすと上位の401ハンドリングが誤動作するため、呼び出し元へ伝播させる
      throw _error;
    }
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  // アプリケーション関連
  async getApplications(): Promise<unknown> {
    return this.request<unknown>('/applications', {
      method: 'GET',
    });
  }

  // 事業者関連
  async getMerchants(params?: { search?: string; page?: number; limit?: number; status?: string; accountStatuses?: string[] }): Promise<unknown> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.accountStatuses && params.accountStatuses.length > 0) {
      queryParams.append('accountStatuses', params.accountStatuses.join(','));
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/merchants?${queryString}` : '/merchants';

    return this.request<unknown>(endpoint, {
      method: 'GET',
    });
  }

  async getMerchant(id: string): Promise<unknown> {
    return this.request<unknown>(`/merchants/${id}`, {
      method: 'GET',
    });
  }

  async getMyMerchant(): Promise<unknown> {
    return this.request<unknown>('/merchants/me', {
      method: 'GET',
    });
  }

  async getMyShop(): Promise<unknown> {
    return this.request<unknown>('/shops/me', {
      method: 'GET',
    });
  }

  async createMerchant(merchantData: unknown): Promise<unknown> {
    return this.request<unknown>('/merchants', {
      method: 'POST',
      body: JSON.stringify(merchantData),
    });
  }

  // ユーザー関連
  async getUsers(searchBody: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    });
  }

  // パスワード関連
  async verifyToken(token: string): Promise<unknown> {
    return this.request<unknown>(`/password/verify-token?token=${token}`, {
      method: 'GET',
    });
  }

  async setPassword(token: string, password: string): Promise<unknown> {
    return this.request<unknown>('/password/set-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // クーポン利用履歴関連
  // セキュリティ改善：個人情報をクエリパラメータで送信しないため、常にPOSTメソッドを使用
  async getCouponUsageHistory(searchBody?: Record<string, unknown>, _queryParams?: string): Promise<unknown> {
    // 常にPOSTリクエストを使用（queryParamsは無視）
    return this.request<unknown>('/admin/coupon-usage-history', {
      method: 'POST',
      body: JSON.stringify(searchBody || {}),
    });
  }

  async updateMerchant(id: string, merchantData: unknown): Promise<unknown> {
    return this.request<unknown>(`/merchants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(merchantData),
    });
  }

  async deleteMerchant(id: string): Promise<void> {
    return this.request<void>(`/merchants/${id}`, {
      method: 'DELETE',
    });
  }

  async updateMerchantStatus(id: string, status: string): Promise<unknown> {
    return this.request<unknown>(`/merchants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async resendMerchantRegistration(id: string): Promise<unknown> {
    return this.request<unknown>(`/merchants/${id}/resend-registration`, {
      method: 'POST',
    });
  }

  async sendPasswordReset(id: string): Promise<unknown> {
    return this.request<unknown>(`/merchants/${id}/send-password-reset`, {
      method: 'POST',
    });
  }

  // ジャンルカテゴリー関連
  async getGenres(): Promise<unknown> {
    return this.request<unknown>('/genres', {
      method: 'GET',
    });
  }

  // 利用シーン関連
  async getScenes(): Promise<unknown> {
    return this.request<unknown>('/scenes', {
      method: 'GET',
    });
  }

  // 店舗関連
  async getShops(queryParams?: string): Promise<unknown> {
    const endpoint = queryParams ? `/shops?${queryParams}` : '/shops';
    return this.request<unknown>(endpoint, {
      method: 'GET',
    });
  }

  async getShop(id: string): Promise<unknown> {
    return this.request<unknown>(`/shops/${id}`, {
      method: 'GET',
    });
  }

  async getShopQrCodeUrl(id: string): Promise<unknown> {
    return this.request<unknown>(`/shops/${id}/qr-code-url`, {
      method: 'GET',
    });
  }

  async getUser(id: string): Promise<unknown> {
    return this.request<unknown>(`/admin/users/${id}`, {
      method: 'GET',
    });
  }

  async updateUser(id: string, userData: unknown): Promise<unknown> {
    return this.request<unknown>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async createShop(shopData: unknown): Promise<unknown> {
    return this.request<unknown>('/shops', {
      method: 'POST',
      body: JSON.stringify(shopData),
    });
  }

  async updateShop(id: string, shopData: unknown): Promise<unknown> {
    return this.request<unknown>(`/shops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(shopData),
    });
  }

  async deleteShop(id: string): Promise<void> {
    return this.request<void>(`/shops/${id}`, {
      method: 'DELETE',
    });
  }

  async updateShopStatus(id: string, statusData: { status: string }): Promise<unknown> {
    return this.request<unknown>(`/shops/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  // クーポン関連
  async getCoupons(queryParams?: string): Promise<unknown> {
    const endpoint = queryParams ? `/coupons?${queryParams}` : '/coupons';
    return this.request<unknown>(endpoint, {
      method: 'GET',
    });
  }

  async getCoupon(id: string): Promise<unknown> {
    return this.request<unknown>(`/coupons/${id}`, {
      method: 'GET',
    });
  }

  async createCoupon(couponData: unknown): Promise<unknown> {
    return this.request<unknown>('/coupons', {
      method: 'POST',
      body: JSON.stringify(couponData),
    });
  }

  async updateCoupon(id: string, couponData: unknown): Promise<unknown> {
    return this.request<unknown>(`/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(couponData),
    });
  }

  async deleteCoupon(id: string): Promise<void> {
    return this.request<void>(`/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCouponStatus(id: string, statusData: { status: string }): Promise<unknown> {
    return this.request<unknown>(`/coupons/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  async updateCouponPublicStatus(id: string, publicStatusData: { isPublic: boolean }): Promise<unknown> {
    return this.request<unknown>(`/coupons/${id}/public-status`, {
      method: 'PATCH',
      body: JSON.stringify(publicStatusData),
    });
  }

  async updateCouponPublicStatusServerSide(id: string, publicStatusData: { isPublic: boolean }, authToken?: string): Promise<unknown> {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';

    try {
      const response = await fetch(`${backendUrl}/coupons/${id}/public-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': authToken }),
        },
        body: JSON.stringify(publicStatusData),
        cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateCouponStatusServerSide(id: string, statusData: { status: string }, authToken?: string): Promise<unknown> {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';

    try {
      const response = await fetch(`${backendUrl}/coupons/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': authToken }),
        },
        body: JSON.stringify(statusData),
        cache: 'no-store', // キャッシュを無効化して機密情報の漏洩を防止
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async issueAccounts(merchantIds: string[]): Promise<{ success: number; failed: number }> {
    const response = await this.request<{ success: boolean; data: { success: number; failed: number } }>('/merchants/issue-accounts', {
      method: 'POST',
      body: JSON.stringify({ merchantIds }),
    });
    return response.data;
  }

  // 管理者アカウント関連
  async getAdminAccounts(params?: { name?: string; email?: string; role?: string; page?: number; limit?: number }): Promise<unknown> {
    const queryParams = new URLSearchParams();
    if (params?.name) queryParams.append('name', params.name);
    if (params?.email) queryParams.append('email', params.email);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/admin?${queryString}` : '/admin';

    return this.request<unknown>(endpoint, {
      method: 'GET',
    });
  }

  // 管理者アカウント関連
  async createAdminAccount(adminAccountData: AdminAccountInput): Promise<unknown> {
    return this.request<unknown>('/admin', {
      method: 'POST',
      body: JSON.stringify(adminAccountData),
    });
  }

  async getAdminAccount(email: string): Promise<unknown> {
    return this.request<unknown>(`/admin/${email}`, {
      method: 'GET',
    });
  }

  async getAdminAccountById(id: string): Promise<unknown> {
    return this.request<unknown>(`/admin/id/${id}`, {
      method: 'GET',
    });
  }

  async updateAdminAccount(email: string, adminAccountData: AdminAccountInput): Promise<unknown> {
    return this.request<unknown>(`/admin/${email}`, {
      method: 'PATCH',
      body: JSON.stringify(adminAccountData),
    });
  }

  async updateAdminAccountById(id: string, adminAccountData: AdminAccountInput): Promise<unknown> {
    return this.request<unknown>(`/admin/id/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(adminAccountData),
    });
  }

  async deleteAdminAccount(id: string): Promise<void> {
    return this.request<void>(`/admin/id/${id}`, {
      method: 'DELETE',
    });
  }

  // メールアドレス変更関連
  async requestEmailChange(data: { currentPassword: string; newEmail: string; confirmEmail: string }): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>('/auth/email/change', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmEmailChange(token: string): Promise<{ success: boolean; data?: { success: boolean; message: string }; error?: string }> {
    return this.request<{ success: boolean; data?: { success: boolean; message: string }; error?: string }>(`/auth/email/change/confirm?token=${token}`, {
      method: 'GET',
    });
  }
}

export const apiClient = new ApiClient();