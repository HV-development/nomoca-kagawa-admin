'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { apiClient } from '@/lib/api';
import { 
  validateRequired, 
  validateEmail, 
  validatePostalCode, 
  validateDate,
  validateMaxLength
} from '@/utils/validation';
import { useAuth } from '@/components/contexts/auth-context';

interface UserFormData {
  nickname: string;
  email: string;
  postalCode: string;
  address: string;
  birthDate: string;
  gender: string;
  saitamaAppId: string;
}

const EMPTY_USER_FORM_DATA: UserFormData = {
  nickname: '',
  email: '',
  postalCode: '',
  address: '',
  birthDate: '',
  gender: '',
  saitamaAppId: '',
};

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const userId = params.id as string;
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM_DATA);

  const [errors, setErrors] = useState<Partial<UserFormData>>({});
  const [addressSearchSuccess, setAddressSearchSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        setFetchError(null);
        const data = (await apiClient.getUser(userId)) as {
          nickname?: string;
          email?: string;
          postalCode?: string;
          address?: string;
          birthDate?: string | null;
          gender?: string | number | null;
          saitamaAppId?: string | null;
        };

        if (!isMounted) return;

        if (!data || typeof data !== 'object') {
          throw new Error('ユーザーデータの取得に失敗しました');
        }

        // バックエンドのenum値をフロントエンドの数値にマッピング
        const genderEnumToNumber: Record<string, string> = {
          'male': '1',
          'female': '2',
          'other': '3',
        };
        const genderValue = data.gender 
          ? (genderEnumToNumber[String(data.gender)] || String(data.gender)) 
          : '';

        setFormData({
          nickname: data.nickname || '',
          email: data.email || '',
          postalCode: data.postalCode || '',
          address: data.address || '',
          birthDate: data.birthDate || '',
          gender: genderValue,
          saitamaAppId: data.saitamaAppId || '',
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('ユーザーデータの取得エラー:', error);
        setFetchError('ユーザーデータの取得に失敗しました');
        setFormData(EMPTY_USER_FORM_DATA);
      } finally {
        if (!isMounted) return;

        if (searchParams) {
          const urlData = {
            nickname: searchParams.get('nickname') || '',
            email: searchParams.get('email') || '',
            postalCode: searchParams.get('postalCode') || '',
            address: searchParams.get('address') || '',
            birthDate: searchParams.get('birthDate') || '',
            gender: searchParams.get('gender') || '',
            saitamaAppId: searchParams.get('saitamaAppId') || '',
          };

          if (Object.values(urlData).some(value => value !== '')) {
            setFormData(prev => ({
              ...prev,
              ...urlData,
            }));
          }
        }

        setIsLoading(false);
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [userId, searchParams]);

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // リアルタイムバリデーション
    validateField(field, value);
  };

  const validateField = (field: keyof UserFormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'nickname':
        const nicknameError = validateRequired(value, 'ニックネーム');
        if (nicknameError) {
          newErrors.nickname = nicknameError;
        } else {
          delete newErrors.nickname;
        }
        break;

      case 'email':
        const emailError = validateRequired(value, 'メールアドレス') || validateMaxLength(value, 255, 'メールアドレス') || (value ? validateEmail(value) : null);
        if (emailError) {
          newErrors.email = emailError;
        } else {
          delete newErrors.email;
        }
        break;

      case 'postalCode':
        const postalCodeError = validateRequired(value, '郵便番号') || validatePostalCode(value);
        if (postalCodeError) {
          newErrors.postalCode = postalCodeError;
        } else {
          delete newErrors.postalCode;
        }
        break;

      case 'birthDate':
        const birthDateError = validateRequired(value, '生年月日') || validateDate(value);
        if (birthDateError) {
          newErrors.birthDate = birthDateError;
        } else {
          delete newErrors.birthDate;
        }
        break;

      case 'gender':
        const genderError = validateRequired(value, '性別');
        if (genderError) {
          newErrors.gender = genderError;
        } else {
          delete newErrors.gender;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateAllFields = (): boolean => {
    const newErrors: Partial<UserFormData> = {};

    // 必須チェック
    const nicknameError = validateRequired(formData.nickname, 'ニックネーム');
    if (nicknameError) newErrors.nickname = nicknameError;

    const emailError = validateRequired(formData.email, 'メールアドレス') || validateMaxLength(formData.email, 255, 'メールアドレス') || validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const postalCodeError = validateRequired(formData.postalCode, '郵便番号') || validatePostalCode(formData.postalCode);
    if (postalCodeError) newErrors.postalCode = postalCodeError;

    const birthDateError = validateRequired(formData.birthDate, '生年月日') || validateDate(formData.birthDate);
    if (birthDateError) newErrors.birthDate = birthDateError;

    const genderError = validateRequired(formData.gender, '性別');
    if (genderError) newErrors.gender = genderError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddressSearch = () => {
    // 成功メッセージをクリア
    setAddressSearchSuccess(null);
    
    // 郵便番号の存在チェック
    if (formData.postalCode.length !== 7) {
      setErrors(prev => ({ ...prev, postalCode: '郵便番号を正しく入力してください（7桁の数字）' }));
      return;
    }

    fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${formData.postalCode}`)
      .then(response => response.json())
      .then(data => {
        if (data.status === 200 && data.results && data.results.length > 0) {
          const result = data.results[0];
          const fullAddress = `${result.address1}${result.address2}${result.address3}`;
          setFormData(prev => ({
            ...prev,
            address: fullAddress
          }));
          setErrors(prev => ({ ...prev, postalCode: undefined }));
          setAddressSearchSuccess('住所を取得しました');
        } else {
          setErrors(prev => ({ ...prev, postalCode: '該当する住所が見つかりませんでした' }));
        }
      })
      .catch(error => {
        console.error('住所検索エラー:', error);
        setErrors(prev => ({ ...prev, postalCode: '住所検索に失敗しました' }));
      });
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    if (validateAllFields()) {
      // 編集確認画面に遷移
      const queryParams = new URLSearchParams({
        id: userId,
        nickname: formData.nickname,
        email: formData.email,
        postalCode: formData.postalCode,
        address: formData.address,
        birthDate: formData.birthDate,
        gender: formData.gender,
        saitamaAppId: formData.saitamaAppId,
      });
      
      router.push(`/users/${userId}/confirm?${queryParams.toString()}`);
    } else {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/users');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">データを読み込んでいます...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ページタイトル */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">ユーザー編集</h1>
            <p className="text-gray-600">
              ユーザー情報を編集します
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

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
            {fetchError}
          </div>
        )}
 
        {/* 編集フォーム */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-6">
            {/* ニックネーム */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                ニックネーム <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nickname"
                placeholder="ニックネームを入力"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.nickname ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.nickname && (
                <p className="mt-1 text-sm text-red-500">{errors.nickname}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                placeholder="メールアドレスを入力"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* 郵便番号と住所検索 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="postalCode"
                  placeholder="1234567（7桁の数字）"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.postalCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={7}
                />
                {errors.postalCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                )}
                {addressSearchSuccess && !errors.postalCode && (
                  <p className="mt-1 text-sm text-green-600">{addressSearchSuccess}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleAddressSearch}
                  className="w-full"
                  disabled={formData.postalCode.length !== 7}
                >
                  住所検索
                </Button>
              </div>
            </div>

            {/* 住所 */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                住所 <span className="text-red-500">*</span>
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {formData.address || '住所検索結果を表示'}
              </div>
            </div>

            {/* 生年月日 */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                生年月日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="birthDate"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.birthDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.birthDate && (
                <p className="mt-1 text-sm text-red-500">{errors.birthDate}</p>
              )}
            </div>

            {/* 性別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                性別 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="1"
                    checked={formData.gender === '1'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">男性</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="2"
                    checked={formData.gender === '2'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">女性</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="3"
                    checked={formData.gender === '3'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="mr-2 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">未回答</span>
                </label>
              </div>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex justify-center space-x-4 pt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
                className="px-8"
              >
                キャンセル
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8"
              >
                {isSubmitting ? '処理中...' : '変更内容を確認する'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}