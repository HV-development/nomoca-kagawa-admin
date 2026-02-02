'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../../lib/api';
import { type AdminLoginInput, type AdminRegisterInput } from '@hv-development/schemas';

type RegisterInput = AdminRegisterInput;

interface User {
  id: string;
  email: string;
  name: string;
  accountType: 'admin' | 'merchant' | 'user' | 'shop';
  role?: string; // adminアカウントの場合のロール（sysadmin, operator, viewer）
  shopId?: string; // 店舗アカウントの場合の店舗ID
  merchantId?: string; // 事業者アカウントまたは店舗アカウントの場合の事業者ID
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AdminLoginInput) => Promise<void>;
  register: (userData: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType | null => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // 静的生成時やSSR時のエラーを防ぐため、nullを返す
    if (typeof window === 'undefined') {
      return null;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Cookieベースの認証のみを使用（sessionStorageは使用しない）

  // 初期化時にトークンをチェック（リトライロジック付き）
  useEffect(() => {
    const initAuth = async () => {
      try {
        // /api/me から現在のアカウント種別を取得
        // accessToken期限切れ等で401になった場合は /api/auth/refresh を試してから再取得する
        type MeResponse = {
          accountType?: 'admin' | 'merchant' | 'user' | 'shop';
          email?: string | null;
          shopId?: string | null;
          merchantId?: string | null;
          role?: string;
        } | null;

        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1秒

        const fetchMe = async (): Promise<{ status: number; data: MeResponse | null }> => {
          try {
            const res = await fetch('/api/me', { credentials: 'include' });
            if (!res.ok) return { status: res.status, data: null };
            const data = (await res.json()) as MeResponse;
            return { status: res.status, data };
          } catch (e) {
            console.error('Auth init: /api/me fetch failed', e);
            return { status: 0, data: null };
          }
        };

        const tryRefresh = async (): Promise<boolean> => {
          try {
            const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
            return res.ok;
          } catch (e) {
            console.error('Auth init: /api/auth/refresh fetch failed', e);
            return false;
          }
        };

        // リトライ付きでfetchMeを実行
        const fetchMeWithRetry = async (retryCount: number): Promise<{ status: number; data: MeResponse | null }> => {
          const result = await fetchMe();
          // ネットワークエラー（status: 0）の場合はリトライ
          if (result.status === 0 && retryCount < MAX_RETRIES) {
            console.warn(`Auth initialization retry (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return fetchMeWithRetry(retryCount + 1);
          }
          return result;
        };

        let meResult = await fetchMeWithRetry(0);
        if (meResult.status === 401 || meResult.status === 403) {
          const refreshed = await tryRefresh();
          if (refreshed) {
            meResult = await fetchMeWithRetry(0);
          }
          
          // リフレッシュ後も認証エラーの場合はログイン画面へリダイレクト
          if (meResult.status === 401 || meResult.status === 403) {
            // ログインページにいる場合はリダイレクトしない（無限ループ防止）
            const isLoginPage = typeof window !== 'undefined' && 
              (window.location.pathname === '/login' || window.location.pathname.startsWith('/login'));
            
            if (!isLoginPage && typeof window !== 'undefined') {
              console.warn(`Auth error (${meResult.status}): redirecting to login`);
              window.location.href = '/login?session=expired';
              return;
            }
          }
        }

        const me = meResult.data as MeResponse;
        if (me && me.accountType) {
          const role = me.role;
          const userData = {
            id: me.email || 'me',
            email: me.email || '',
            name: me.email || 'Account',
            accountType: me.accountType,
            role,
            shopId: (me.shopId ?? undefined) || undefined,
            merchantId: (me.merchantId ?? undefined) || undefined,
          };
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: AdminLoginInput) => {
    try {
      const response = await apiClient.login(credentials);

      const accountData = (response as unknown as { account: unknown }).account as { 
        accountType: string; 
        shopId?: string; 
        merchantId?: string;
        email: string;
        displayName?: string;
      };
      
      // ログイン後、/api/meを呼び出してroleを含む完全なユーザー情報を取得
      type MeResponse = {
        accountType?: 'admin' | 'merchant' | 'user' | 'shop';
        email?: string | null;
        shopId?: string | null;
        merchantId?: string | null;
        role?: string;
      } | null;
      const me = await apiClient.getMe().catch(() => null) as MeResponse;

      // ユーザー情報を保存
      let userData: User;
      
      if (me && me.accountType) {
        userData = {
          id: me.email || accountData.email || 'me',
          email: me.email || accountData.email || '',
          name: accountData.displayName || me.email || accountData.email || 'Account',
          accountType: me.accountType,
          role: me.role,
          shopId: (me.shopId ?? accountData.shopId ?? undefined) || undefined,
          merchantId: (me.merchantId ?? accountData.merchantId ?? undefined) || undefined,
        };
        setUser(userData);
        // Cookieベースの認証のみを使用（sessionStorageは使用しない）
      } else {
        // /api/meが失敗した場合でも、accountDataからユーザー情報を設定
        userData = {
          id: accountData.email, // 仮のIDとしてemailを使用
          email: accountData.email,
          name: accountData.displayName || accountData.email,
          accountType: accountData.accountType as 'admin' | 'merchant' | 'user' | 'shop',
          shopId: accountData.shopId,
          merchantId: accountData.merchantId
        };
        setUser(userData);
        // Cookieベースの認証のみを使用（sessionStorageは使用しない）
      }
    } catch (error) {
      console.error('❌ AuthContext: login failed', error);
      throw error;
    }
  };

  const register = async (userData: RegisterInput) => {
    try {
      const response = await apiClient.register(userData);
      
      const accountData = response.account as { 
        accountType: string; 
        shopId?: string; 
        merchantId?: string;
        email: string;
        displayName?: string;
      };
      setUser({
        id: accountData.email, // 仮のIDとしてemailを使用
        email: accountData.email,
        name: accountData.displayName || accountData.email,
        accountType: accountData.accountType as 'admin' | 'merchant' | 'user' | 'shop',
        shopId: accountData.shopId,
        merchantId: accountData.merchantId
      });
    } catch (error) {
      console.error('❌ AuthContext: register failed', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('❌ AuthContext: logout failed', error);
    } finally {
      // 表示用ユーザーデータの保存を廃止
      setUser(null);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await apiClient.refreshToken();
    } catch (error) {
      console.error('❌ AuthContext: token refresh failed', error);
      // リフレッシュに失敗した場合はログアウト
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};