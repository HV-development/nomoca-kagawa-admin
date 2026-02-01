'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Icon from '@/components/atoms/Icon';
import Button from '@/components/atoms/Button';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

interface EmailChangeFormData {
  newEmail: string;
  confirmEmail: string;
  currentPassword: string;
}

interface PasswordChangeFormData {
  newPassword: string;
  confirmPassword: string;
}

export default function MerchantAccountEditPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const merchantId = params?.id as string;
  const { toasts, addToast, removeToast } = useToast();
  
  const [currentEmail, setCurrentEmail] = useState<string>('');
  
  const [emailFormData, setEmailFormData] = useState<EmailChangeFormData>({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });
  
  const [passwordFormData, setPasswordFormData] = useState<PasswordChangeFormData>({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);

  const emailFieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const passwordFieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
          setCurrentEmail(response.data!.account?.email || '');
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

  // メールアドレス変更フォームのハンドラー
  const handleEmailInputChange = (field: keyof EmailChangeFormData, value: string) => {
    setEmailFormData(prev => ({ ...prev, [field]: value }));
    
    if (emailErrors[field]) {
      setEmailErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateEmailField = (field: keyof EmailChangeFormData, value: string): string | null => {
    switch (field) {
      case 'newEmail':
        if (!value.trim()) {
          return '新しいメールアドレスは必須です';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return '有効なメールアドレスを入力してください';
        }
        if (value === currentEmail) {
          return '現在のメールアドレスと同じです';
        }
        break;
      case 'confirmEmail':
        if (!value.trim()) {
          return 'メールアドレス（確認）は必須です';
        }
        if (value !== emailFormData.newEmail) {
          return 'メールアドレスが一致しません';
        }
        break;
      case 'currentPassword':
        if (!value.trim()) {
          return '現在のパスワードは必須です';
        }
        break;
    }
    return null;
  };

  const handleEmailBlur = (field: keyof EmailChangeFormData) => {
    const value = emailFormData[field];
    const error = validateEmailField(field, value);
    
    if (error) {
      setEmailErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setEmailErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateEmailFormData = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    let hasErrors = false;

    const newEmailError = validateEmailField('newEmail', emailFormData.newEmail);
    if (newEmailError) {
      fieldErrors.newEmail = newEmailError;
      hasErrors = true;
    }

    const confirmEmailError = validateEmailField('confirmEmail', emailFormData.confirmEmail);
    if (confirmEmailError) {
      fieldErrors.confirmEmail = confirmEmailError;
      hasErrors = true;
    }

    const currentPasswordError = validateEmailField('currentPassword', emailFormData.currentPassword);
    if (currentPasswordError) {
      fieldErrors.currentPassword = currentPasswordError;
      hasErrors = true;
    }

    if (hasErrors) {
      setEmailErrors(fieldErrors);
      return false;
    }
    
    setEmailErrors({});
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailFormData()) {
      addToast({ type: 'error', message: '入力内容にエラーがあります' });
      return;
    }

    try {
      setIsEmailSubmitting(true);
      setServerError('');

      await apiClient.requestEmailChange({
        currentPassword: emailFormData.currentPassword,
        newEmail: emailFormData.newEmail,
        confirmEmail: emailFormData.confirmEmail
      });
      
      setEmailChangeSuccess(true);
      addToast({ type: 'success', message: '確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。' });
      
      // フォームをリセット
      setEmailFormData({
        newEmail: '',
        confirmEmail: '',
        currentPassword: ''
      });
    } catch (error) {
      console.error('Failed to request email change:', error);
      if (error instanceof Error) {
        if (error.message.includes('INVALID_PASSWORD') || error.message.includes('現在のパスワードが正しくありません')) {
          setServerError('現在のパスワードが正しくありません');
        } else if (error.message.includes('EMAIL_ALREADY_EXISTS') || error.message.includes('既に使用されています')) {
          setServerError('このメールアドレスは既に使用されています');
        } else if (error.message.includes('EMAIL_MISMATCH')) {
          setServerError('メールアドレスが一致しません');
        } else {
          setServerError(error.message || 'メールアドレス変更リクエストに失敗しました');
        }
      } else {
        setServerError('メールアドレス変更リクエストに失敗しました');
      }
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  // パスワード変更フォームのハンドラー
  const handlePasswordInputChange = (field: keyof PasswordChangeFormData, value: string) => {
    setPasswordFormData(prev => ({ ...prev, [field]: value }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePasswordField = (field: keyof PasswordChangeFormData, value: string): string | null => {
    switch (field) {
      case 'newPassword':
        if (!value.trim()) {
          return '新しいパスワードは必須です';
        }
        if (value.length < 8) {
          return 'パスワードは8文字以上で入力してください';
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) {
          return 'パスワード（確認）は必須です';
        }
        if (value !== passwordFormData.newPassword) {
          return 'パスワードが一致しません';
        }
        break;
    }
    return null;
  };

  const handlePasswordBlur = (field: keyof PasswordChangeFormData) => {
    const value = passwordFormData[field];
    const error = validatePasswordField(field, value);
    
    if (error) {
      setPasswordErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePasswordFormData = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    let hasErrors = false;

    const newPasswordError = validatePasswordField('newPassword', passwordFormData.newPassword);
    if (newPasswordError) {
      fieldErrors.newPassword = newPasswordError;
      hasErrors = true;
    }

    const confirmPasswordError = validatePasswordField('confirmPassword', passwordFormData.confirmPassword);
    if (confirmPasswordError) {
      fieldErrors.confirmPassword = confirmPasswordError;
      hasErrors = true;
    }

    if (hasErrors) {
      setPasswordErrors(fieldErrors);
      return false;
    }
    
    setPasswordErrors({});
    return true;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordFormData()) {
      addToast({ type: 'error', message: '入力内容にエラーがあります' });
      return;
    }

    try {
      setIsPasswordSubmitting(true);
      setServerError('');

      await apiClient.updateMerchant(merchantId, {
        password: passwordFormData.newPassword,
        confirmPassword: passwordFormData.confirmPassword
      });
      
      addToast({ type: 'success', message: 'パスワードを更新しました' });
      
      // フォームをリセット
      setPasswordFormData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to update password:', error);
      setServerError('パスワードの更新に失敗しました');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
                <span className="font-medium text-gray-900">{displayName}</span>
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

        {/* 現在のメールアドレス表示 */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">現在のメールアドレス</p>
          <p className="text-lg font-medium text-gray-900">{currentEmail}</p>
        </div>

        {/* メールアドレス変更フォーム */}
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">メールアドレスの変更</h3>
            
            {emailChangeSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-xl mr-2">✅</span>
                  <div>
                    <p className="text-sm text-green-800 font-medium">確認メールを送信しました</p>
                    <p className="text-sm text-green-700 mt-1">
                      新しいメールアドレス宛に確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailChangeSuccess(false)}
                  className="mt-4 text-sm text-green-700 hover:text-green-800 underline"
                >
                  別のメールアドレスで再度変更する
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  メールアドレスを変更するには、新しいメールアドレス宛に確認メールを送信します。
                  メール内のリンクをクリックすると変更が完了します。
                </p>

                {/* 新しいメールアドレス */}
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    新しいメールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { emailFieldRefs.current.newEmail = el; }}
                    type="email"
                    id="newEmail"
                    value={emailFormData.newEmail}
                    onChange={(e) => handleEmailInputChange('newEmail', e.target.value)}
                    onBlur={() => handleEmailBlur('newEmail')}
                    className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                      emailErrors.newEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="新しいメールアドレスを入力"
                  />
                  {emailErrors.newEmail && (
                    <p className="mt-1 text-sm text-red-600">{emailErrors.newEmail}</p>
                  )}
                </div>

                {/* 新しいメールアドレス（確認） */}
                <div>
                  <label htmlFor="confirmEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    新しいメールアドレス（確認） <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { emailFieldRefs.current.confirmEmail = el; }}
                    type="email"
                    id="confirmEmail"
                    value={emailFormData.confirmEmail}
                    onChange={(e) => handleEmailInputChange('confirmEmail', e.target.value)}
                    onBlur={() => handleEmailBlur('confirmEmail')}
                    className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                      emailErrors.confirmEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="確認のため再度入力"
                  />
                  {emailErrors.confirmEmail && (
                    <p className="mt-1 text-sm text-red-600">{emailErrors.confirmEmail}</p>
                  )}
                </div>

                {/* 現在のパスワード */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    現在のパスワード <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={(el) => { emailFieldRefs.current.currentPassword = el; }}
                    type="password"
                    id="currentPassword"
                    value={emailFormData.currentPassword}
                    onChange={(e) => handleEmailInputChange('currentPassword', e.target.value)}
                    onBlur={() => handleEmailBlur('currentPassword')}
                    className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                      emailErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="セキュリティのため現在のパスワードを入力"
                  />
                  {emailErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{emailErrors.currentPassword}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isEmailSubmitting}
                  >
                    {isEmailSubmitting ? '送信中...' : '確認メールを送信'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* パスワード変更フォーム */}
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">パスワードの変更</h3>
            
            <div className="space-y-6">
              {/* 新しいパスワード */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  新しいパスワード <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { passwordFieldRefs.current.newPassword = el; }}
                  type="password"
                  id="newPassword"
                  value={passwordFormData.newPassword}
                  onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                  onBlur={() => handlePasswordBlur('newPassword')}
                  className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="新しいパスワードを入力"
                />
                <div className="mt-1">
                  {passwordErrors.newPassword ? (
                    <p className="text-sm text-red-600">{passwordErrors.newPassword}</p>
                  ) : (
                    <p className="text-sm text-gray-500">8文字以上で入力してください</p>
                  )}
                </div>
              </div>

              {/* パスワード確認 */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  新しいパスワード（確認） <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { passwordFieldRefs.current.confirmPassword = el; }}
                  type="password"
                  id="confirmPassword"
                  value={passwordFormData.confirmPassword}
                  onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                  onBlur={() => handlePasswordBlur('confirmPassword')}
                  className={`w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="確認のため再度入力"
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPasswordSubmitting}
                >
                  {isPasswordSubmitting ? '更新中...' : 'パスワードを更新'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* 戻るボタン */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push('/merchants')}
            className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
          >
            戻る
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
