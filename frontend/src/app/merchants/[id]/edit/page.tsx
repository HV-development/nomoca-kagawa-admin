'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { validateMerchantField, type MerchantFormData, type MerchantEditFormData } from '@hv-development/schemas';
import { useAddressSearch, applyAddressSearchResult } from '@/hooks/use-address-search';
import { useAuth } from '@/components/contexts/auth-context';
import { PREFECTURES } from '@/lib/constants/japan';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

export default function MerchantEditPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const merchantId = params.id as string;
  
  const [formData, setFormData] = useState<MerchantEditFormData>({
    name: '',
    nameKana: '',
    representativeNameLast: '',
    representativeNameFirst: '',
    representativeNameLastKana: '',
    representativeNameFirstKana: '',
    representativePhone: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    applications: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [issueAccount, setIssueAccount] = useState(false); // アカウント発行チェックボックス
  const [hasAccount, setHasAccount] = useState(false); // アカウント発行済みかどうか
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [status, setStatus] = useState<'inactive' | 'active' | 'terminated'>('inactive'); // 契約ステータス
  
  // 事業者アカウントの場合はアクセス拒否
  useEffect(() => {
    if (auth?.user?.accountType === 'merchant') {
      router.push('/merchants');
      return;
    }
  }, [auth, router]);
  
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
    },
    (error) => {
      setErrors(prev => ({ ...prev, postalCode: error }));
    }
  );
  
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null }>({});

  // 事業者データの読み込み
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadMerchantData = async () => {
      try {
        // APIから事業者データを取得（Cookieベース認証）
        // コンポーネントがアンマウントされている場合は処理を中断
        if (!isMounted) return;
        
        const result = await apiClient.getMerchant(merchantId) as { data: unknown };
        const merchantData = result.data; // APIレスポンスから data プロパティを取得
        
        if (isMounted && merchantData) {
          const merchant = merchantData as {
            account?: { status?: string };
            status?: string;
            name?: string;
            nameKana?: string;
            representativeNameLast?: string;
            representativeNameFirst?: string;
            representativeNameLastKana?: string;
            representativeNameFirstKana?: string;
            representativePhone?: string;
            email?: string;
            phone?: string;
            postalCode?: string;
            prefecture?: string;
            city?: string;
            address1?: string;
            address2?: string;
            applications?: string[];
          };
          
          // アカウント発行済みかどうかを確認（statusが'pending'または'active'の場合は発行済み）
          const accountStatus = merchant.account?.status;
          setHasAccount(accountStatus === 'pending' || accountStatus === 'active');
          
          // 契約ステータスを設定
          setStatus((merchant.status as 'active' | 'inactive' | 'terminated') || 'inactive');
          
          // APIレスポンスをフォームデータに変換
          setFormData({
            name: merchant.name || '',
            nameKana: merchant.nameKana || '',
            representativeNameLast: merchant.representativeNameLast || '',
            representativeNameFirst: merchant.representativeNameFirst || '',
            representativeNameLastKana: merchant.representativeNameLastKana || '',
            representativeNameFirstKana: merchant.representativeNameFirstKana || '',
            representativePhone: merchant.representativePhone || '',
            email: merchant.email || '',
            phone: merchant.phone || '',
            postalCode: merchant.postalCode || '',
            prefecture: merchant.prefecture || '',
            city: merchant.city || '',
            address1: merchant.address1 || '',
            address2: merchant.address2 || '',
            applications: merchant.applications || [],
          });
        }
      } catch (error) {
        // アボート時のエラーは無視
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        if (!isMounted) return;
        
        console.error('❌ 事業者データの読み込みエラー:', error);
        if (error instanceof Error && 'response' in error) {
          const apiError = error as Error & { response?: { data: unknown } };
          const errorData = apiError.response?.data as { error?: { message?: string } } | undefined;
          showError(`事業者データの取得に失敗しました: ${errorData?.error?.message || '不明なエラー'}`);
        } else {
          showError(`事業者データの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (merchantId) {
      loadMerchantData();
    }

    // クリーンアップ: コンポーネントのアンマウント時または再実行時にリクエストをキャンセル
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [merchantId]);

  const handleInputChange = (field: keyof MerchantEditFormData, value: string) => {
    setFormData((prev: MerchantEditFormData) => ({ ...prev, [field]: value }));
    
    // リアルタイムバリデーション（emailとphoneフィールドは個別にバリデーション）
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
    } else if (field === 'phone') {
      // phoneの簡易バリデーション
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は必須です' }));
      } else if (!/^\d+$/.test(value)) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は数値のみで入力してください（ハイフン無し）' }));
      } else if (value.length < 10 || value.length > 11) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は10-11桁で入力してください' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    } else {
      const error = validateMerchantField(field as keyof MerchantFormData, value || '');
      if (error) {
        setErrors((prev: Record<string, string>) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev: Record<string, string>) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    }
  };

  const handleBlur = (field: keyof MerchantEditFormData) => {
    const value = formData[field];
    
    // emailとphoneフィールドは個別にバリデーション
    if (field === 'email') {
      const emailValue = value as string;
      if (!emailValue.trim()) {
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
    } else if (field === 'phone') {
      const phoneValue = value as string;
      if (!phoneValue.trim()) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は必須です' }));
      } else if (!/^\d+$/.test(phoneValue)) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は数値のみで入力してください（ハイフン無し）' }));
      } else if (phoneValue.length < 10 || phoneValue.length > 11) {
        setErrors((prev) => ({ ...prev, phone: '電話番号は10-11桁で入力してください' }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    } else {
      const error = validateMerchantField(field as keyof MerchantFormData, (value as string) || '');
      if (error) {
        setErrors((prev: Record<string, string>) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev: Record<string, string>) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
      }
    }
  };

  const getCharacterCount = (field: keyof MerchantEditFormData, maxLength: number) => {
    const currentLength = ((formData[field] as string) || '').length;
    return `${currentLength} / ${maxLength}`;
  };

  const handleAddressSearch = async () => {
    await searchAddress(formData.postalCode);
  };

  const validateFormData = (): boolean => {
    const fieldErrors: Record<string, string> = {};
    let hasErrors = false;

    // 各フィールドを個別にバリデーション
    const fieldsToValidate: (keyof MerchantEditFormData)[] = [
      'name',
      'nameKana', 
      'representativeNameLast',
      'representativeNameFirst',
      'representativeNameLastKana',
      'representativeNameFirstKana',
      'representativePhone',
      'email',
      'phone',
      'postalCode',
      'prefecture',
      'city',
      'address1'
    ];

    fieldsToValidate.forEach(field => {
      if (field === 'email' || field === 'phone') {
        // emailとphoneフィールドは個別にバリデーション（MerchantFormSchemaに存在しないため）
        const value = formData[field] || '';
        if (field === 'email') {
          if (!value.trim()) {
            fieldErrors.email = 'メールアドレスは必須です';
            hasErrors = true;
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            fieldErrors.email = '有効なメールアドレスを入力してください';
            hasErrors = true;
          }
        } else if (field === 'phone') {
          if (!value.trim()) {
            fieldErrors.phone = '電話番号は必須です';
            hasErrors = true;
          } else if (!/^\d+$/.test(value)) {
            fieldErrors.phone = '電話番号は数値のみで入力してください（ハイフン無し）';
            hasErrors = true;
          } else if (value.length < 10 || value.length > 11) {
            fieldErrors.phone = '電話番号は10-11桁で入力してください';
            hasErrors = true;
          }
        }
      } else if (field !== 'applications') {
        // applications以外のフィールドはMerchantFormSchemaでバリデーション
        const value = formData[field] || '';
        const error = validateMerchantField(field as keyof MerchantFormData, value);
        if (error) {
          fieldErrors[field] = error;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setErrors(fieldErrors);
      return false;
    }
    
    // バリデーション成功
    setErrors({});
    return true;
  };

  const handlePasswordReset = async () => {
    if (window.confirm('パスワード再設定メールを送信しますか？')) {
      setIsSendingPasswordReset(true);
      try {
        await apiClient.sendPasswordReset(merchantId);
        showSuccess('パスワード再設定メールを送信しました');
      } catch (error) {
        console.error('パスワード再設定メールの送信に失敗しました:', error);
        if (error instanceof Error && 'response' in error) {
          const apiError = error as Error & { response?: { data: unknown } };
          const errorData = apiError.response?.data as { error?: { message?: string } } | undefined;
          showError(`パスワード再設定メールの送信に失敗しました: ${errorData?.error?.message || '不明なエラー'}`);
        } else {
          showError('パスワード再設定メールの送信に失敗しました');
        }
      } finally {
        setIsSendingPasswordReset(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormData()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // APIに送信するデータを準備
      const updateData = {
        name: formData.name,
        nameKana: formData.nameKana,
        representativeNameLast: formData.representativeNameLast,
        representativeNameFirst: formData.representativeNameFirst,
        representativeNameLastKana: formData.representativeNameLastKana,
        representativeNameFirstKana: formData.representativeNameFirstKana,
        representativePhone: formData.representativePhone,
        email: formData.email,
        postalCode: formData.postalCode,
        prefecture: formData.prefecture,
        city: formData.city,
        address1: formData.address1,
        address2: formData.address2,
        issueAccount, // アカウント発行フラグ
        status, // 契約ステータス
      };

      await apiClient.updateMerchant(merchantId, updateData);
      
      showSuccess('事業者の更新が完了しました。');
      // 事業者一覧に遷移
      setTimeout(() => {
        router.push('/merchants');
      }, 1500);
    } catch (error) {
      console.error('更新エラー:', error);
      if (error instanceof Error && 'response' in error) {
        const apiError = error as Error & { response?: { data: unknown } };
        const errorData = apiError.response?.data as { message?: string; error?: { message?: string } } | undefined;
        showError(`更新中にエラーが発生しました: ${errorData?.message || errorData?.error?.message || '不明なエラー'}`);
      } else {
        showError('更新中にエラーが発生しました。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">事業者編集</h1>
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

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">基本情報</h3>
            
            <div className="space-y-6">
              {/* 事業者名 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  事業者名 <span className="text-red-500">*</span>
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
                  placeholder="事業者名を入力"
                />
                <div className="mt-1 flex justify-between items-center">
                  {errors.name ? (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  ) : (
                    <div></div>
                  )}
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
                  placeholder="事業者名（カナ）を入力"
                />
                <div className="mt-1 flex justify-between items-center">
                  {errors.nameKana ? (
                    <p className="text-sm text-red-600">{errors.nameKana}</p>
                  ) : (
                    <div></div>
                  )}
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
                    {errors.representativeNameLast ? (
                      <p className="text-sm text-red-600">{errors.representativeNameLast}</p>
                    ) : (
                      <div></div>
                    )}
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
                    {errors.representativeNameFirst ? (
                      <p className="text-sm text-red-600">{errors.representativeNameFirst}</p>
                    ) : (
                      <div></div>
                    )}
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
                    {errors.representativeNameLastKana ? (
                      <p className="text-sm text-red-600">{errors.representativeNameLastKana}</p>
                    ) : (
                      <div></div>
                    )}
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
                    {errors.representativeNameFirstKana ? (
                      <p className="text-sm text-red-600">{errors.representativeNameFirstKana}</p>
                    ) : (
                      <div></div>
                    )}
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
                {errors.representativePhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.representativePhone}</p>
                )}
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-100 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="メールアドレスを入力してください"
                />
                <div className="mt-1 flex justify-between items-center">
                  {errors.email ? (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  ) : (
                    <div></div>
                  )}
                  <p className="text-sm text-gray-500">{getCharacterCount('email', 255)}</p>
                </div>
              </div>

              {/* アカウント発行チェックボックス（アカウント未発行の場合のみ表示） */}
              {!hasAccount && (
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
              )}
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
                    onClick={handleAddressSearch}
                    disabled={formData.postalCode.length !== 7 || isSearchingAddress}
                    className="w-32"
                  >
                    {isSearchingAddress ? '検索中...' : '住所検索'}
                  </Button>
                </div>
                {errors.postalCode && (
                  <div className="mt-1" style={{ maxWidth: 'calc(10rem + 8rem + 1rem)' }}>
                    <p className="text-sm text-red-600">{errors.postalCode}</p>
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
                  {errors.prefecture && (
                    <p className="text-sm text-red-600">{errors.prefecture}</p>
                  )}
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
                  {errors.city ? (
                    <p className="text-sm text-red-600">{errors.city}</p>
                  ) : (
                    <div></div>
                  )}
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
                  {errors.address1 ? (
                    <p className="text-sm text-red-600">{errors.address1}</p>
                  ) : (
                    <div></div>
                  )}
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
                  {errors.address2 ? (
                    <p className="text-sm text-red-600">{errors.address2}</p>
                  ) : (
                    <div></div>
                  )}
                  <p className="text-sm text-gray-500">{getCharacterCount('address2', 255)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 契約ステータス */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">契約ステータス</h3>
            
            <div className="space-y-6">
              <div className="w-60">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  契約ステータス <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'inactive' | 'active' | 'terminated')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="inactive">未契約</option>
                  <option value="active">契約中</option>
                  <option value="terminated">解約済み</option>
                </select>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              キャンセル
            </Button>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '更新中...' : '更新する'}
              </Button>
              {hasAccount && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-blue-600 bg-white text-blue-600 hover:bg-blue-50 focus:ring-blue-500"
                  onClick={handlePasswordReset}
                  disabled={isSendingPasswordReset}
                >
                  {isSendingPasswordReset ? '送信中...' : 'パスワード再設定'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
