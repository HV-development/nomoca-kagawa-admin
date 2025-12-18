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

  // 初期化時にトークンをチェック
  useEffect(() => {
    const initAuth = async () => {
      try {
        // /api/me から現在のアカウント種別を取得（401時に自動リフレッシュはしない）
        type MeResponse = {
          accountType?: 'admin' | 'merchant' | 'user' | 'shop';
          email?: string | null;
          shopId?: string | null;
          merchantId?: string | null;
          role?: string;
        } | null;
        const me = await apiClient.getMe().catch(() => null) as MeResponse;
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