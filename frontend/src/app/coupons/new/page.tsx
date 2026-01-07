'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { apiClient } from '@/lib/api';
import type { CouponCreateRequest, CouponStatus, Shop, Coupon } from '@hv-development/schemas';
import { 
  validateRequired, 
  validateMaxLength, 
  validateFileSize
} from '@/utils/validation';
import { useAuth } from '@/components/contexts/auth-context';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

const MerchantSelectModal = dynamicImport(() => import('@/components/molecules/MerchantSelectModal'), {
  loading: () => null,
  ssr: false,
});

const ShopSelectModal = dynamicImport(() => import('@/components/molecules/ShopSelectModal'), {
  loading: () => null,
  ssr: false,
});

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface Merchant {
  id: string;
  name: string;
  account: {
    email: string;
  };
}

interface CouponFormData {
  shopId: string;
  couponName: string;
  couponContent: string;
  couponConditions: string;
  drinkType: string;
  couponImage: File | null;
  imagePreview: string;
  imageUrl: string;
  publishStatus: string;
}

type CouponFormErrors = Partial<Record<keyof CouponFormData, string>>;

function CouponNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { toasts, removeToast, showError } = useToast();
  
  // アカウントタイプの判定
  const isAdminAccount = auth?.user?.accountType === 'admin';
  const isMerchantAccount = auth?.user?.accountType === 'merchant';
  const isShopAccount = auth?.user?.accountType === 'shop';
  
  const [formData, setFormData] = useState<CouponFormData>({
    shopId: '',
    couponName: '',
    couponContent: '',
    couponConditions: '',
    drinkType: '',
    couponImage: null,
    imagePreview: '',
    imageUrl: '',
    publishStatus: 'active',
  });

  const [errors, setErrors] = useState<CouponFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_isUploading, setIsUploading] = useState(false);
  
  // 事業者・店舗選択用の状態
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  useEffect(() => {
    // sessionStorageからデータを復元（確認画面から戻った場合）
    const restoreFromSessionStorage = async () => {
      try {
        const storedData = sessionStorage.getItem('couponConfirmData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          
          // フォームデータを復元
          setFormData(prev => ({
            ...prev,
            shopId: parsedData.shopId || prev.shopId,
            couponName: parsedData.couponName || prev.couponName,
            couponContent: parsedData.couponContent || prev.couponContent,
            couponConditions: parsedData.couponConditions || prev.couponConditions,
            drinkType: parsedData.drinkType || prev.drinkType,
            publishStatus: parsedData.publishStatus === '1' ? 'active' : parsedData.publishStatus === '2' ? 'inactive' : prev.publishStatus,
            imagePreview: parsedData.imagePreview || prev.imagePreview,
            imageUrl: parsedData.imageUrl || prev.imageUrl,
            couponImage: null, // ファイルは復元できない
          }));
          
          // 店舗情報を復元
          if (parsedData.shopId) {
            try {
              const shopData = await apiClient.getShop(parsedData.shopId) as Shop;
              setSelectedShop(shopData);
              
              if (shopData.merchant) {
                setSelectedMerchant({
                  id: shopData.merchant.id,
                  name: shopData.merchant.name,
                  account: { email: '' }
                });
              }
            } catch (error) {
              console.error('店舗情報の取得に失敗しました:', error);
            }
          }
        }
      } catch (error) {
        console.error('sessionStorageからのデータ復元に失敗しました:', error);
      }
    };
    
    // URLパラメータから値を取得してフォームに設定（後方互換性のため）
    if (searchParams) {
      const urlData = {
        couponName: searchParams.get('couponName') || '',
        couponContent: searchParams.get('couponContent') || '',
        publishStatus: searchParams.get('publishStatus') || '',
        imagePreview: searchParams.get('imagePreview') || '',
      };
      
      // いずれかの値が存在する場合のみフォームデータを更新
      if (Object.values(urlData).some(value => value !== '')) {
        setFormData(prev => ({
          ...prev,
          ...urlData,
          couponImage: null, // ファイルはURLパラメータでは復元できない
        }));
      }
    }
    
    // sessionStorageからデータを復元
    restoreFromSessionStorage();
  }, [searchParams]);
  
  // アカウントタイプに応じた初期化
  useEffect(() => {
    const initializeAccountData = async () => {
      // 店舗アカウントの場合: 事業者と店舗情報を自動設定
      if (isShopAccount && auth?.user?.shopId) {
        try {
          const shopData = await apiClient.getShop(auth.user.shopId) as Shop;
          setSelectedShop(shopData);
          setFormData(prev => ({ ...prev, shopId: shopData.id }));
          
          if (shopData.merchant) {
            setSelectedMerchant({
              id: shopData.merchant.id,
              name: shopData.merchant.name,
              account: { email: '' }
            });
          }
        } catch (error) {
          console.error('店舗情報の取得に失敗しました:', error);
        }
      }
      
      // 事業者アカウントの場合: 事業者情報を自動設定
      if (isMerchantAccount) {
        try {
          const merchantData = await apiClient.getMyMerchant() as { data: Merchant };
          if (merchantData && merchantData.data) {
            setSelectedMerchant(merchantData.data);
          }
        } catch (error) {
          console.error('事業者情報の取得に失敗しました:', error);
        }
      }
    };
    
    initializeAccountData();
  }, [isShopAccount, isMerchantAccount, auth?.user?.shopId]);

  const handleInputChange = (field: keyof CouponFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // リアルタイムバリデーション
    validateField(field, value);
  };

  const validateField = (field: keyof CouponFormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'couponName':
        const couponNameError = validateRequired(value, 'クーポン名') || validateMaxLength(value, 25, 'クーポン名');
        if (couponNameError) {
          newErrors.couponName = couponNameError;
        } else {
          delete newErrors.couponName;
        }
        break;

      case 'couponContent':
        const couponContentError = validateRequired(value, 'クーポン内容') || validateMaxLength(value, 100, 'クーポン内容');
        if (couponContentError) {
          newErrors.couponContent = couponContentError;
        } else {
          delete newErrors.couponContent;
        }
        break;

    }

    setErrors(newErrors);
  };
  
  // 事業者選択ハンドラー
  const handleMerchantSelect = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    // 事業者を変更した場合、店舗選択をリセット
    setSelectedShop(null);
    setFormData(prev => ({ ...prev, shopId: '' }));
  };
  
  // 店舗選択ハンドラー
  const handleShopSelect = (shop: Shop) => {
    setSelectedShop(shop);
    setFormData(prev => ({ ...prev, shopId: shop.id }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const newErrors = { ...errors };

    if (file) {
      // 画像形式チェック
      if (!file.type.startsWith('image/')) {
        newErrors.couponImage = '画像ファイルのみアップロード可能です';
        setErrors(newErrors);
        return;
      }
      
      const fileSizeError = validateFileSize(file, 10);
      
      if (fileSizeError) {
        newErrors.couponImage = fileSizeError;
        setErrors(newErrors);
        return;
      }

      // プレビュー表示
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          couponImage: file,
          imagePreview: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);

      // 新規登録時は画像をアップロードしない（クーポン作成後に更新で追加）
      // プレビュー用にローカル画像URLを保存
      setFormData(prev => ({
        ...prev,
        imageUrl: '' // 空文字列でプレビュー用のフラグとして使用
      }));

      delete newErrors.couponImage;
      setErrors(newErrors);
    }
  };

  const scrollToFirstError = (errorKeys: string[]) => {
    // エラーの優先順位に従ってスクロール
    const fieldOrder = ['shopId', 'couponName', 'couponContent', 'drinkType'];
    
    for (const field of fieldOrder) {
      if (errorKeys.includes(field)) {
        let element: HTMLElement | null = null;
        
        switch (field) {
          case 'shopId':
            // 店舗選択エラーの場合、店舗選択セクションにスクロール
            element = document.querySelector('[data-field="shopId"]') as HTMLElement;
            break;
          case 'couponName':
            element = document.getElementById('couponName');
            break;
          case 'couponContent':
            element = document.getElementById('couponContent');
            break;
          case 'drinkType':
            // ドリンク種別の場合、ドリンク種別セクションにスクロール
            element = document.querySelector('[data-field="drinkType"]') as HTMLElement;
            break;
        }
        
        if (element) {
          setTimeout(() => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element?.focus();
          }, 100);
          break;
        }
      }
    }
  };

  const validateAllFields = (): boolean => {
    const newErrors: CouponFormErrors = {};

    // 必須チェック
    const couponNameError = validateRequired(formData.couponName, 'クーポン名') || validateMaxLength(formData.couponName, 25, 'クーポン名');
    if (couponNameError) newErrors.couponName = couponNameError;

    const couponContentError = validateRequired(formData.couponContent, 'クーポン内容') || validateMaxLength(formData.couponContent, 100, 'クーポン内容');
    if (couponContentError) newErrors.couponContent = couponContentError;

    const drinkTypeError = validateRequired(formData.drinkType, 'ドリンク種別');
    if (drinkTypeError) newErrors.drinkType = drinkTypeError;
    
    // 店舗選択チェック
    if (!formData.shopId) {
      newErrors.shopId = '店舗を選択してください';
    } else {
      // UUID形式チェック（簡易版）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(formData.shopId);
      if (!isValidUuid) {
        newErrors.shopId = '選択された店舗のIDが無効です。別の店舗を選択してください。';
      }
    }

    setErrors(newErrors);
    
    // エラーがある場合、最初のエラーフィールドにスクロール
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(Object.keys(newErrors));
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (validateAllFields()) {
      // 管理者アカウントの場合は確認画面に遷移
      if (!isMerchantAccount) {
        // 画像プレビュー（base64データ）はURLパラメータが長くなりすぎるため、sessionStorageに保存
        const confirmData = {
          shopId: formData.shopId,
          couponName: formData.couponName,
          couponContent: formData.couponContent,
          couponConditions: formData.couponConditions || '',
          drinkType: formData.drinkType || '',
          publishStatus: formData.publishStatus === 'active' ? '1' : '2',
          imagePreview: formData.imagePreview || '',
          imageUrl: formData.imageUrl || '',
        };
        
        // sessionStorageに保存（画像データを含む）
        try {
          sessionStorage.setItem('couponConfirmData', JSON.stringify(confirmData));
        } catch (error) {
          console.error('sessionStorageへの保存に失敗しました:', error);
          showError('データの保存に失敗しました。もう一度お試しください。');
          setIsSubmitting(false);
          return;
        }
        
        // URLパラメータは最小限（画像データは除外）
        router.push('/coupons/confirm');
        setIsSubmitting(false);
        return;
      }
      
      // 事業者アカウントの場合は直接申請
      try {
        // まず画像なしでクーポンを作成
        const couponData: CouponCreateRequest = {
          shopId: formData.shopId,
          title: formData.couponName,
          description: formData.couponContent || null,
          conditions: formData.couponConditions || null,
          drinkType: (formData.drinkType === 'alcohol' || formData.drinkType === 'soft_drink' || formData.drinkType === 'other') ? formData.drinkType : null,
          imageUrl: null,
          status: 'pending' as CouponStatus,
          isPublic: false
        };
        const createdCoupon = await apiClient.createCoupon(couponData) as Coupon;
        
        // 画像がある場合はアップロードして更新
        if (formData.couponImage && createdCoupon.id && selectedShop) {
          try {
            setIsUploading(true);
            
            // タイムスタンプを生成
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
            
            // selectedShopからmerchantIdを取得
            const merchantId = selectedShop.merchantId || selectedShop.merchant?.id;
            if (!merchantId) {
              throw new Error('事業者IDが取得できませんでした');
            }
            
            const uploadFormData = new FormData();
            uploadFormData.append('image', formData.couponImage);
            uploadFormData.append('type', 'coupon');
            uploadFormData.append('shopId', formData.shopId);
            uploadFormData.append('merchantId', merchantId);
            uploadFormData.append('couponId', createdCoupon.id);
            uploadFormData.append('timestamp', timestamp);
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: uploadFormData,
              // Cookieベース認証によりヘッダー注入は不要
              credentials: 'include',
            });
            
            if (response.ok) {
              const uploadData = await response.json();
              
              // 画像URLを更新
              await apiClient.updateCoupon(createdCoupon.id, {
                imageUrl: uploadData.url
              });
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error('画像アップロード失敗:', response.status, errorData);
            }
          } catch (error) {
            console.error('画像アップロードエラー:', error);
          } finally {
            setIsUploading(false);
          }
        }
        
        // 作成成功後、一覧画面に遷移
        router.push('/coupons');
      } catch (error: unknown) {
        console.error('クーポンの作成に失敗しました:', error);
        
        // エラーメッセージを取得
        let errorMessage = 'クーポンの作成に失敗しました。もう一度お試しください。';
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error as { response?: { data?: { message?: string } } };
          if (apiError.response?.data?.message) {
            errorMessage = apiError.response.data.message;
          }
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = (error as { message: string }).message;
        }
        
        // 店舗IDのバリデーションエラーの場合
        if (errorMessage.includes('shopId') || errorMessage.includes('uuid')) {
          errorMessage = '選択された店舗のIDが無効です。別の店舗を選択してください。';
        }
        
        // imageUrlのバリデーションエラーの場合
        if (errorMessage.includes('imageUrl') || errorMessage.includes('uri')) {
          errorMessage = '画像URLが無効です。画像を再度アップロードしてください。';
        }
        
        showError(errorMessage);
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // sessionStorageをクリア
    try {
      sessionStorage.removeItem('couponConfirmData');
    } catch (error) {
      console.error('sessionStorageのクリアに失敗しました:', error);
    }
    
    // フォームデータをリセット
    setFormData({
      shopId: '',
      couponName: '',
      couponContent: '',
      couponConditions: '',
      drinkType: '',
      couponImage: null,
      imagePreview: '',
      imageUrl: '',
      publishStatus: 'active',
    });
    
    // エラーをクリア
    setErrors({});
    
    // 選択状態をリセット
    setSelectedMerchant(null);
    setSelectedShop(null);
    
    router.push('/coupons');
  };

  return (
    <AdminLayout>
      {/* モーダル */}
      <MerchantSelectModal
        isOpen={isMerchantModalOpen}
        onClose={() => setIsMerchantModalOpen(false)}
        onSelect={handleMerchantSelect}
        selectedMerchantId={selectedMerchant?.id}
      />
      
      <ShopSelectModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        onSelect={handleShopSelect}
        selectedShopId={selectedShop?.id}
        merchantId={selectedMerchant?.id}
      />
      
      <div className="space-y-6">
        {/* ページタイトル */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">クーポン新規登録</h1>
            <p className="text-gray-600">
              新しいクーポンを登録します
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

        {/* 登録フォーム */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-6">
            {/*事業者・店舗選択 */}
            {isAdminAccount && (
              <>
                {/* 管理者：事業者選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業者 <span className="text-red-500">*</span>
                  </label>
                  {selectedMerchant && (
                    <div className="mb-2 text-sm text-gray-900">
                      {selectedMerchant.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMerchantModalOpen(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                  >
                  事業者を選択
                  </button>
                </div>
                
                {/* 管理者：店舗選択 */}
                <div data-field="shopId">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    店舗 <span className="text-red-500">*</span>
                  </label>
                  {selectedShop && (
                    <div className="mb-2 text-base text-gray-900">
                      {selectedShop.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsShopModalOpen(true)}
                    disabled={!selectedMerchant}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    店舗を選択
                  </button>
                  {!selectedMerchant && (
                    <p className="mt-1 text-xs text-gray-500">先に事業者を選択してください</p>
                  )}
                  <ErrorMessage message={errors.shopId} />
                </div>
              </>
            )}
            
            {isMerchantAccount && (
              <>
                {/* 事業者アカウント：事業者名表示（変更不可） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業者 <span className="text-red-500">*</span>
                  </label>
                  <div className="text-sm text-gray-900 mb-1">
                    {selectedMerchant?.name || '読み込み中...'}
                  </div>
                  <p className="text-xs text-gray-500">自身の事業者が設定されています（変更不可）</p>
                </div>
                
                {/* 事業者アカウント：店舗選択 */}
                <div data-field="shopId">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    店舗名 <span className="text-red-500">*</span>
                  </label>
                  {selectedShop && (
                    <div className="mb-2 text-sm text-gray-900">
                      {selectedShop.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsShopModalOpen(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                  >
                    店舗を選択
                  </button>
                  <ErrorMessage message={errors.shopId} />
                </div>
              </>
            )}
            
            {isShopAccount && (
              <>
                {/* 店舗アカウント：事業者名表示（変更不可） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業者 <span className="text-red-500">*</span>
                  </label>
                  <div className="text-sm text-gray-900 mb-1">
                    {selectedMerchant?.name || '読み込み中...'}
                  </div>
                  <p className="text-xs text-gray-500">自身の事業者が設定されています（変更不可）</p>
                </div>
                
                {/* 店舗アカウント：店舗名表示（変更不可） */}
                <div data-field="shopId">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    店舗 <span className="text-red-500">*</span>
                  </label>
                  <div className="text-sm text-gray-900 mb-1">
                    {selectedShop?.name || '読み込み中...'}
                  </div>
                  <p className="text-xs text-gray-500">自身の店舗が設定されています（変更不可）</p>
                  <ErrorMessage message={errors.shopId} />
                </div>
              </>
            )}

            {/* クーポン名 */}
            <div>
              <label htmlFor="couponName" className="block text-sm font-medium text-gray-700 mb-2">
                クーポン名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="couponName"
                placeholder="クーポン名を入力（最大25文字）"
                value={formData.couponName}
                onChange={(e) => handleInputChange('couponName', e.target.value)}
                className={`w-150 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.couponName ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={25}
              />
              <ErrorMessage message={errors.couponName} />
            </div>

            {/* クーポン内容 */}
            <div>
              <label htmlFor="couponContent" className="block text-sm font-medium text-gray-700 mb-2">
                クーポン内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="couponContent"
                placeholder="クーポン内容を入力（最大100文字）"
                value={formData.couponContent}
                onChange={(e) => handleInputChange('couponContent', e.target.value)}
                className={`w-150 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.couponContent ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                maxLength={100}
              />
              <ErrorMessage message={errors.couponContent} />
            </div>

            {/* 利用条件 */}
            <div>
              <label htmlFor="couponConditions" className="block text-sm font-medium text-gray-700 mb-2">
                利用条件
              </label>
              <textarea
                id="couponConditions"
                placeholder="利用条件を入力（最大500文字）"
                value={formData.couponConditions}
                onChange={(e) => handleInputChange('couponConditions', e.target.value)}
                className={`w-150 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  errors.couponConditions ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                maxLength={500}
              />
              <ErrorMessage message={errors.couponConditions} />
            </div>

            {/* ドリンク種別 */}
            <div data-field="drinkType">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ドリンク種別 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="drinkType"
                    value="alcohol"
                    checked={formData.drinkType === 'alcohol'}
                    onChange={(e) => handleInputChange('drinkType', e.target.value)}
                    className="mr-2"
                  />
                  <span>アルコール</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="drinkType"
                    value="soft_drink"
                    checked={formData.drinkType === 'soft_drink'}
                    onChange={(e) => handleInputChange('drinkType', e.target.value)}
                    className="mr-2"
                  />
                  <span>ソフトドリンク</span>
                </label>
              </div>
              <ErrorMessage message={errors.drinkType} />
            </div>

            {/* クーポン画像 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                クーポン画像
              </label>
              <div className="space-y-4">
                {/* 画像プレビュー */}
                {formData.imagePreview && (
                  <div className="relative w-64 h-48">
                    <Image
                      src={formData.imagePreview}
                      alt="クーポン画像プレビュー"
                      fill
                      className="object-cover rounded-lg"
                      unoptimized={formData.imagePreview.startsWith('blob:') || formData.imagePreview.startsWith('data:')}
                    />
                  </div>
                )}
                
                {/* アップロードボタン */}
                <div>
                  <input
                    type="file"
                    id="couponImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('couponImage')?.click()}
                    className="w-full md:w-auto"
                  >
                    画像アップロード
                  </Button>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, WEBP形式の画像をアップロードできます（最大10MB）
                  </p>
                </div>
              </div>
              <ErrorMessage message={errors.couponImage} />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-center gap-4 pt-6">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? '処理中...' : (isMerchantAccount ? '申請する' : '登録内容を確認する')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function CouponNewPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CouponNewPageContent />
    </Suspense>
  );
}
