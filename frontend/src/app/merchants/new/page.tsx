'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import { useToast } from '@/hooks/use-toast';
import { validateMerchantField, type MerchantFormData } from '@hv-development/schemas';
import { useAddressSearch, applyAddressSearchResult } from '@/hooks/use-address-search';
import { useAuth } from '@/components/contexts/auth-context';
import { PREFECTURES } from '@/lib/constants/japan';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import { apiClient } from '@/lib/api';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default function MerchantNewPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // 事業者アカウントの場合はアクセス拒否
  useEffect(() => {
    if (auth?.user?.accountType === 'merchant') {
      router.push('/merchants');
      return;
    }
  }, [auth, router]);
  
  // フォームデータに追加のフィールドを含める
  const [formData, setFormData] = useState<MerchantFormData & { email: string }>({
    name: '',
    nameKana: '',
    representativeNameLast: '',
    representativeNameFirst: '',
    representativeNameLastKana: '',
    representativeNameFirstKana: '',
    representativePhone: '',
    email: '', // アカウント用メールアドレス
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    applicationId: '', // アプリケーションIDは空（APIで自動設定）
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [issueAccount, setIssueAccount] = useState(false); // アカウント発行チェックボックス
  
  // 住所検索フック
  const { isSearching: isSearchingAddress, searchAddress } = useAddressSearch(
    (result) => {
      setFormData(prev => applyAddressSearchResult(prev, result));
      // 住所フィールドのエラーをクリア
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.prefecture;
        delete newErrors.city;
        delete newErrors.address1;
        return newErrors;
      });
      showSuccess('住所を取得しました');
    },
    (error) => {
      setErrors(prev => ({ ...prev, postalCode: error }));
    }
  );
  
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null }>({});

  const handleInputChange = (field: keyof (MerchantFormData & { email: string }), value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // リアルタイムバリデーション（emailフィールドは個別にバリデーション）
    if (field === 'email') {
      // emailの簡易バリデーション
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, email: 'メールアドレスは必須です' }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErrors((prev) => ({ ...prev, email: '有効なメールアドレスを入力してください' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } else if (field !== 'applicationId') {
      const error = validateMerchantField(field, value || '');
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    }
  };

  const handleBlur = (field: keyof (MerchantFormData & { email: string })) => {
    const value = formData[field];
    
    if (field === 'email') {
      // emailの簡易バリデーション
      const emailValue = value as string;
      if (!emailValue || !emailValue.trim()) {
        setErrors((prev) => ({ ...prev, email: 'メールアドレスは必須です' }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        setErrors((prev) => ({ ...prev, email: '有効なメールアドレスを入力してください' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } else if (field !== 'applicationId') {
      const error = validateMerchantField(field as keyof MerchantFormData, (value as string) || '');
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    }
  };

  const handleZipcodeSearch = async () => {
    await searchAddress(formData.postalCode);
  };

  const validateFormData = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    let hasErrors = false;

    // 各フィールドを個別にバリデーション
    const fieldsToValidate: (keyof MerchantFormData)[] = [
      'name',
      'nameKana', 
      'representativeNameLast',
      'representativeNameFirst',
      'representativeNameLastKana',
      'representativeNameFirstKana',
      'representativePhone',
      'postalCode',
      'prefecture',
      'city',
      'address1'
    ];

    fieldsToValidate.forEach(field => {
      const value = (formData[field] as string) || '';
      const error = validateMerchantField(field, value);
      if (error) {
        fieldErrors[field] = error;
        hasErrors = true;
      }
    });

    // emailフィールドの個別バリデーション
    if (!formData.email.trim()) {
      fieldErrors.email = 'メールアドレスは必須です';
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      fieldErrors.email = '有効なメールアドレスを入力してください';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(fieldErrors);
      return false;
    }
    
    // バリデーション成功
    setErrors({});
    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    
    if (!validateFormData()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // emailフィールドをaccountEmailにマッピング
      // APIスキーマに合わせてフィールドをマッピング
      const requestData = {
        accountEmail: formData.email,
        name: formData.name,
        nameKana: formData.nameKana,
        representativeNameLast: formData.representativeNameLast,
        representativeNameFirst: formData.representativeNameFirst,
        representativeNameLastKana: formData.representativeNameLastKana,
        representativeNameFirstKana: formData.representativeNameFirstKana,
        representativePhone: formData.representativePhone,
        postalCode: formData.postalCode,
        prefecture: formData.prefecture,
        city: formData.city,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        issueAccount, // アカウント発行フラグ
      };

      await apiClient.createMerchant(requestData);
      
      // 成功時の処理
      router.push('/merchants');
      
    } catch (error) {
      console.error('登録エラー:', error);
      
      // apiClientのエラーレスポンスを処理
      if (error instanceof Error && 'response' in error) {
        const apiError = error as Error & { response?: { status: number; data: unknown } };
        const status = apiError.response?.status;
        const errorData = apiError.response?.data as { error?: { details?: Array<{ path: string[]; message: string }>; message?: string }; errors?: Record<string, string>; message?: string } | undefined;
        
        if (status === 400) {
          // パラメータエラーの場合
          if (errorData?.error?.details) {
            // 新しいエラー形式: { error: { details: [...] } }
            const fieldErrors: Record<string, string> = {};
            errorData.error.details.forEach((detail) => {
              if (detail.path && detail.path.length > 0) {
                const fieldName = detail.path[0];
                fieldErrors[fieldName] = detail.message;
              }
            });
            setErrors(fieldErrors);
            
            // 最初のエラーフィールドにスクロール
            const firstErrorField = Object.keys(fieldErrors)[0];
            if (firstErrorField && fieldRefs.current[firstErrorField as keyof typeof fieldRefs.current]) {
              const element = fieldRefs.current[firstErrorField as keyof typeof fieldRefs.current];
              element?.focus();
              element?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          } else if (errorData?.errors) {
            // 古いエラー形式: { errors: {...} }
            setErrors(errorData.errors);
            // 最初のエラーフィールドにスクロール
            const firstErrorField = Object.keys(errorData.errors)[0];
            if (firstErrorField && fieldRefs.current[firstErrorField as keyof typeof fieldRefs.current]) {
              const element = fieldRefs.current[firstErrorField as keyof typeof fieldRefs.current];
              element?.focus();
              element?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          } else {
            setServerError(errorData?.error?.message || errorData?.message || '入力内容に誤りがあります');
          }
        } else {
          // その他のエラーの場合（409 Conflictなど）
          const errorMessage = errorData?.error?.message || errorData?.message || error.message || '登録中にエラーが発生しました';
          showError(errorMessage);
        }
      } else {
        showError('登録中にエラーが発生しました');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCharacterCount = (field: keyof MerchantFormData, maxLength: number) => {
    const currentLength = (formData[field] || '').length;
    return `${currentLength} / ${maxLength}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">事業者新規登録</h1>
              <p className="text-gray-600">
                新しい事業者を登録します
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
        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">基本情報</h3>
            
            <div className="space-y-6">
              {/* 事業者名 / 代表店舗名 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  事業者名 / 代表店舗名 <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.name = el; }}
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="事業者名 / 代表店舗名を入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.name} />
                  <p className="text-sm text-gray-500">{getCharacterCount('name', 50)}</p>
                </div>
              </div>

              {/* 事業者名（カナ） */}
              <div>
                <label htmlFor="nameKana" className="block text-sm font-medium text-gray-700 mb-2">
                  事業者名（カナ） <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.nameKana = el; }}
                  type="text"
                  id="nameKana"
                  value={formData.nameKana}
                  onChange={(e) => handleInputChange('nameKana', e.target.value)}
                  onBlur={() => handleBlur('nameKana')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.nameKana ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="事業者名（カナ）を入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.nameKana} />
                  <p className="text-sm text-gray-500">{getCharacterCount('nameKana', 100)}</p>
                </div>
              </div>

              {/* 代表者名（姓・名） */}
              <div className="flex gap-4">
                <div className="w-50">
                  <label htmlFor="representativeNameLast" className="block text-sm font-medium text-gray-700 mb-2">
                    代表者名（姓） <span className="text-red-500">*</span>
                  </label>
                    <input
                      ref={(el) => { fieldRefs.current.representativeNameLast = el; }}
                      type="text"
                      id="representativeNameLast"
                      value={formData.representativeNameLast}
                      onChange={(e) => handleInputChange('representativeNameLast', e.target.value)}
                      onBlur={() => handleBlur('representativeNameLast')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.representativeNameLast ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="姓を入力してください"
                      maxLength={25}
                    />
                  <div className="mt-1 flex justify-between items-center">
                    <ErrorMessage message={errors.representativeNameLast} />
                    <p className="text-sm text-gray-500">{getCharacterCount('representativeNameLast', 25)}</p>
                  </div>
                </div>

                <div className="w-50">
                  <label htmlFor="representativeNameFirst" className="block text-sm font-medium text-gray-700 mb-2">
                    代表者名（名） <span className="text-red-500">*</span>
                  </label>
                    <input
                      ref={(el) => { fieldRefs.current.representativeNameFirst = el; }}
                      type="text"
                      id="representativeNameFirst"
                      value={formData.representativeNameFirst}
                      onChange={(e) => handleInputChange('representativeNameFirst', e.target.value)}
                      onBlur={() => handleBlur('representativeNameFirst')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.representativeNameFirst ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="名を入力してください"
                      maxLength={25}
                    />
                    <div className="mt-1 flex justify-between items-center">
                      <ErrorMessage message={errors.representativeNameFirst} />
                      <p className="text-sm text-gray-500">{getCharacterCount('representativeNameFirst', 25)}</p>
                    </div>
                </div>
              </div>

              {/* 代表者名（姓・名 / カナ） */}
              <div className="flex gap-4">
                <div className="w-50">
                  <label htmlFor="representativeNameLastKana" className="block text-sm font-medium text-gray-700 mb-2">
                    代表者名（姓 / カナ） <span className="text-red-500">*</span>
                  </label>
                    <input
                      ref={(el) => { fieldRefs.current.representativeNameLastKana = el; }}
                      type="text"
                      id="representativeNameLastKana"
                      value={formData.representativeNameLastKana}
                      onChange={(e) => handleInputChange('representativeNameLastKana', e.target.value)}
                      onBlur={() => handleBlur('representativeNameLastKana')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.representativeNameLastKana ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="姓（カナ）を入力してください"
                      maxLength={50}
                    />
                    <div className="mt-1 flex justify-between items-center">
                      <ErrorMessage message={errors.representativeNameLastKana} />
                      <p className="text-sm text-gray-500">{getCharacterCount('representativeNameLastKana', 50)}</p>
                    </div>
                </div>

                <div className="w-50">
                  <label htmlFor="representativeNameFirstKana" className="block text-sm font-medium text-gray-700 mb-2">
                    代表者名（名 / カナ） <span className="text-red-500">*</span>
                  </label>
                    <input
                      ref={(el) => { fieldRefs.current.representativeNameFirstKana = el; }}
                      type="text"
                      id="representativeNameFirstKana"
                      value={formData.representativeNameFirstKana}
                      onChange={(e) => handleInputChange('representativeNameFirstKana', e.target.value)}
                      onBlur={() => handleBlur('representativeNameFirstKana')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.representativeNameFirstKana ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="名（カナ）を入力してください"
                      maxLength={50}
                    />
                  <div className="mt-1 flex justify-between items-center">
                    <ErrorMessage message={errors.representativeNameFirstKana} />
                    <p className="text-sm text-gray-500">{getCharacterCount('representativeNameFirstKana', 50)}</p>
                  </div>
                </div>
              </div>

              {/* 代表者電話番号 */}
              <div className="w-100">
                <label htmlFor="representativePhone" className="block text-sm font-medium text-gray-700 mb-2">
                  代表者電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.representativePhone = el; }}
                  type="tel"
                  id="representativePhone"
                  value={formData.representativePhone}
                  onChange={(e) => handleInputChange('representativePhone', e.target.value.replace(/\D/g, ''))}
                  onBlur={() => handleBlur('representativePhone')}
                  className={`w-100 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.representativePhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="電話番号を入力してください（ハイフン無し）"
                />
                <div className="mt-1 flex justify-between">
                  <ErrorMessage message={errors.representativePhone} />
                </div>
              </div>

              {/* メールアドレス */}
              <div className="w-100">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.email = el; }}
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email' as keyof (MerchantFormData & { email: string }), e.target.value)}
                  onBlur={() => handleBlur('email' as keyof (MerchantFormData & { email: string }))}
                  className={`w-100 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="メールアドレスを入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.email} />
                  <p className="text-sm text-gray-500">{formData.email.length} / 255</p>
                </div>
              </div>

              {/* アカウント発行チェックボックス */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="issueAccount"
                  checked={issueAccount}
                  onChange={(e) => setIssueAccount(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="issueAccount" className="ml-2 text-sm font-medium text-gray-700">
                  アカウントを発行する（パスワード設定メールを送信）
                </label>
              </div>
            </div>
          </div>

          {/* 住所情報 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">住所情報</h3>
            
            <div className="space-y-6">
              {/* 郵便番号と住所検索 */}
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    ref={(el) => { fieldRefs.current.postalCode = el; }}
                    type="text"
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('postalCode')}
                    className={`w-40 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567"
                    maxLength={7}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleZipcodeSearch}
                    disabled={formData.postalCode.length !== 7 || isSearchingAddress}
                    className="w-32"
                  >
                    {isSearchingAddress ? '検索中...' : '住所検索'}
                  </Button>
                </div>
                {errors.postalCode && (
                  <div className="mt-1" style={{ maxWidth: 'calc(10rem + 8rem + 1rem)' }}>
                    <ErrorMessage message={errors.postalCode} />
                  </div>
                )}
              </div>

              {/* 都道府県 */}
              <div className="w-60">
                <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-2">
                  都道府県 <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current.prefecture = el; }}
                  id="prefecture"
                  value={formData.prefecture}
                  onChange={(e) => handleInputChange('prefecture', e.target.value)}
                  onBlur={() => handleBlur('prefecture')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.prefecture ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">都道府県を選択</option>
                  {PREFECTURES.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
                <div className="mt-1 flex justify-between">
                  <ErrorMessage message={errors.prefecture} />
                </div>
              </div>

              {/* 市区町村 */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  市区町村 <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.city = el; }}
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  onBlur={() => handleBlur('city')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="市区町村を入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.city} />
                  <p className="text-sm text-gray-500">{getCharacterCount('city', 255)}</p>
                </div>
              </div>

              {/* 番地以降 */}
              <div>
                <label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-2">
                  番地以降 <span className="text-red-500">*</span>
                </label>
                <input
                  ref={(el) => { fieldRefs.current.address1 = el; }}
                  type="text"
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => handleInputChange('address1', e.target.value)}
                  onBlur={() => handleBlur('address1')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.address1 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="番地以降を入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.address1} />
                  <p className="text-sm text-gray-500">{getCharacterCount('address1', 255)}</p>
                </div>
              </div>

              {/* 建物名 / 部屋番号 */}
              <div>
                <label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-2">
                  建物名 / 部屋番号
                </label>
                <input
                  ref={(el) => { fieldRefs.current.address2 = el; }}
                  type="text"
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => handleInputChange('address2', e.target.value)}
                  onBlur={() => handleBlur('address2')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.address2 ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="建物名 / 部屋番号を入力してください（任意）"
                />
                <div className="mt-1 flex justify-between items-center">
                  <ErrorMessage message={errors.address2} />
                  <p className="text-sm text-gray-500">{getCharacterCount('address2', 255)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登録中...' : '登録'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
