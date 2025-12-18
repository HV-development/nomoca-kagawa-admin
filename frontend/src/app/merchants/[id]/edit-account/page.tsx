'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Icon from '@/components/atoms/Icon';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

interface AccountFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function MerchantAccountEditPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const merchantId = params?.id as string;
  const { toasts, addToast, removeToast } = useToast();
  
  const [formData, setFormData] = useState<AccountFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 事業者アカウントでない場合はアクセス拒否
  useEffect(() => {
    if (auth?.user?.accountType !== 'merchant') {
      router.push('/merchants');
      return;
    }
  }, [auth, router]);

  // 事業者情報を取得
  useEffect(() => {
    const fetchMerchantData = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getMyMerchant() as { success: boolean; data?: { account?: { email?: string } } };
        if (response.success && response.data) {
          setFormData(prev => ({
            ...prev,
            email: response.data!.account?.email || ''
          }));
        }
      } catch (error) {
        console.error('Failed to fetch merchant data:', error);
        addToast({ type: 'error', message: '事業者情報の取得に失敗しました' });
      } finally {
        setIsLoading(false);
      }
    };

    if (merchantId) {
      fetchMerchantData();
    }
  }, [merchantId, addToast]);

  const handleInputChange = (field: keyof AccountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateField = (field: keyof AccountFormData, value: string): string | null => {
    switch (field) {
      case 'email':
        if (!value.trim()) {
          return 'メールアドレスは必須です';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return '有効なメールアドレスを入力してください';
        }
        break;
      case 'password':
        if (value && value.length < 8) {
          return 'パスワードは8文字以上で入力してください';
        }
        break;
      case 'confirmPassword':
        if (formData.password && value !== formData.password) {
          return 'パスワードが一致しません';
        }
        break;
    }
    return null;
  };

  const handleBlur = (field: keyof AccountFormData) => {
    const value = formData[field];
    const error = validateField(field, value);
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateFormData = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    let hasErrors = false;

    // メールアドレスは必須
    const emailError = validateField('email', formData.email);
    if (emailError) {
      fieldErrors.email = emailError;
      hasErrors = true;
    }

    // パスワードは任意だが、入力された場合は確認パスワードも必須
    if (formData.password) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) {
        fieldErrors.password = passwordError;
        hasErrors = true;
      }

      const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
      if (confirmPasswordError) {
        fieldErrors.confirmPassword = confirmPasswordError;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormData()) {
      addToast({ type: 'error', message: '入力内容にエラーがあります' });
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError('');

      const updateData: { email: string; password?: string } = {
        email: formData.email
      };

      // パスワードが入力されている場合のみ含める
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await apiClient.updateMerchant(merchantId, updateData) as { success: boolean; error?: string };
      
      if (response.success) {
        addToast({ type: 'success', message: 'アカウント情報を更新しました' });
        router.push('/merchants');
      } else {
        setServerError(response.error || 'アカウント情報の更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      setServerError('アカウント情報の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">アカウント情報編集</h1>
              <p className="text-gray-600">
                事業者ID: {merchantId}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
                <span className="font-medium text-gray-900">管理者太郎</span>
              </div>
            </div>
          </div>
        </div>

        {/* サーバーエラー表示 */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <div>
                <p className="text-sm text-red-800">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">アカウント情報</h3>
            
            <div className="space-y-6">
              {/* メールアドレス */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.email = el; }}
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-xl px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="メールアドレスを入力してください"
                />
                <div className="mt-1">
                  {errors.email ? (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  ) : (
                    <p className="text-sm text-gray-500">ログインに使用するメールアドレスです</p>
                  )}
                </div>
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  ref={(el) => { fieldRefs.current.password = el; }}
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`w-xl px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="新しいパスワードを入力してください（変更しない場合は空欄）"
                />
                <div className="mt-1">
                  {errors.password ? (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  ) : (
                    <p className="text-sm text-gray-500">8文字以上で入力してください。変更しない場合は空欄のままにしてください。</p>
                  )}
                </div>
              </div>

              {/* パスワード確認 */}
              {formData.password && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード確認 <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { fieldRefs.current.confirmPassword = el; }}
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`w-xl px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="パスワードを再入力してください"
                  />
                  <div className="mt-1">
                    {errors.confirmPassword ? (
                      <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                    ) : (
                      <p className="text-sm text-gray-500">上記で入力したパスワードと同じものを入力してください</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ボタンエリア */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/merchants')}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary"
            >
              {isSubmitting ? '更新中...' : '更新する'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}