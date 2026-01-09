'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { apiClient } from '@/lib/api';
import { SMOKING_OPTIONS } from '@/lib/constants/shop';

export const dynamic = 'force-dynamic';

interface ShopConfirmData {
  merchantId: string;
  genreId: string;
  accountEmail: string;
  name: string;
  nameKana: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  latitude: string;
  longitude: string;
  description: string;
  details: string;
  holidays: string;
  smokingType: string;
  homepageUrl: string;
  couponUsageStart: string;
  couponUsageEnd: string;
  couponUsageDays: string;
  paymentMydigi: boolean;
  paymentCash: boolean;
  area: string;
  status: string;
  createAccount: boolean;
  password: string;
  // 追加データ
  shopId: string | null;
  isEdit: boolean;
  merchantName: string;
  genreName: string;
  selectedScenes: string[];
  customSceneText: string;
  selectedHolidays: string[];
  customHolidayText: string;
  selectedCreditBrands: string[];
  customCreditText: string;
  selectedQrBrands: string[];
  customQrText: string;
  selectedServices: string[];
  customServicesText?: string;
  holidaysForSubmit: string;
  paymentCreditJson: { brands: string[]; other?: string } | null;
  paymentCodeJson: { services: string[]; other?: string } | null;
  existingImages: string[];
  imagePreviews: string[];
  hasExistingAccount: boolean;
  fallbackRedirect: string;
  sceneNames: Record<string, string>;
}

function ShopEditConfirmContent() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id as string;
  const { toasts, removeToast, showError } = useToast();
  const [shopData, setShopData] = useState<ShopConfirmData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // sessionStorageからデータを取得
    try {
      const storedData = sessionStorage.getItem('shopConfirmData');
      if (storedData) {
        const parsedData = JSON.parse(storedData) as ShopConfirmData;
        
        // sessionStorageから読み込んだデータのservices確認ログ
        console.log('[更新確認画面] sessionStorageから読み込んだデータのservices確認:', {
          'parsedData.selectedServices存在': 'selectedServices' in parsedData,
          'parsedData.selectedServices値': parsedData.selectedServices,
          'parsedData.selectedServices型': typeof parsedData.selectedServices,
          'parsedData.selectedServices配列か': Array.isArray(parsedData.selectedServices),
          'parsedData.selectedServices長さ': Array.isArray(parsedData.selectedServices) ? parsedData.selectedServices.length : 0,
        });
        
        // 編集確認画面なのでisEditがtrueかつshopIdが一致することを確認
        if (parsedData.isEdit && parsedData.shopId === shopId) {
          setShopData(parsedData);
        } else if (!parsedData.isEdit) {
          // 新規登録の場合は登録確認画面に遷移
          router.push('/shops/confirm');
        } else {
          // shopIdが一致しない場合は編集画面に戻る
          router.push(`/shops/${shopId}/edit`);
        }
      } else {
        // データがない場合は編集画面に戻る
        router.push(`/shops/${shopId}/edit`);
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      router.push(`/shops/${shopId}/edit`);
    }
  }, [shopId, router]);

  const handleModify = () => {
    // sessionStorageのデータは保持したまま戻る
    router.back();
  };

  const getSmokingTypeLabel = (smokingType: string) => {
    const option = SMOKING_OPTIONS.find(opt => opt.value === smokingType);
    return option?.label || smokingType;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      registering: '登録中',
      collection_requested: '情報収集依頼済み',
      approval_pending: '承認待ち',
      promotional_materials_preparing: '宣材準備中',
      promotional_materials_shipping: '宣材発送中',
      operating: '営業中',
      suspended: '停止中',
      terminated: '終了',
    };
    return statusLabels[status] || status;
  };

  const handleUpdate = async () => {
    if (!shopData) return;
    
    setIsSubmitting(true);
    try {
      // 住所フィールドを結合
      const fullAddress = [
        shopData.prefecture,
        shopData.city,
        shopData.address1,
        shopData.address2
      ].filter(Boolean).join('');
      
      // アカウントメールの設定
      let accountEmail: string | null | undefined;
      if (shopData.createAccount) {
        accountEmail = shopData.accountEmail || null;
      } else {
        accountEmail = null;
      }

      const submitData = {
        merchantId: shopData.merchantId,
        genreId: shopData.genreId,
        accountEmail,
        name: shopData.name,
        nameKana: shopData.nameKana || undefined,
        phone: shopData.phone,
        postalCode: shopData.postalCode,
        prefecture: shopData.prefecture,
        city: shopData.city,
        address1: shopData.address1,
        address2: shopData.address2 || undefined,
        address: fullAddress,
        latitude: Number(shopData.latitude),
        longitude: Number(shopData.longitude),
        description: shopData.description || undefined,
        details: shopData.details || undefined,
        holidays: shopData.holidaysForSubmit || undefined,
        smokingType: shopData.smokingType || undefined,
        homepageUrl: shopData.homepageUrl || null,
        couponUsageStart: shopData.couponUsageStart || null,
        couponUsageEnd: shopData.couponUsageEnd || null,
        couponUsageDays: shopData.couponUsageDays || null,
        paymentMydigi: shopData.paymentMydigi,
        paymentCash: shopData.paymentCash,
        paymentCredit: shopData.paymentCreditJson,
        paymentCode: shopData.paymentCodeJson,
        paymentApps: { mydigi: shopData.paymentMydigi ?? false },
        services: Array.isArray(shopData.selectedServices) && shopData.selectedServices.length > 0 ? { services: shopData.selectedServices } : undefined,
        area: shopData.area || undefined,
        status: shopData.status as 'registering' | 'collection_requested' | 'approval_pending' | 'promotional_materials_preparing' | 'promotional_materials_shipping' | 'operating' | 'suspended' | 'terminated',
        images: shopData.existingImages,
        sceneIds: shopData.selectedScenes,
        customSceneText: shopData.customSceneText || undefined,
      };

      // submitDataのservices確認ログ
      console.log('[更新確認画面] submitDataのservices確認:', {
        'shopData.selectedServices存在': 'selectedServices' in shopData,
        'shopData.selectedServices値': shopData.selectedServices,
        'shopData.selectedServices型': typeof shopData.selectedServices,
        'shopData.selectedServices配列か': Array.isArray(shopData.selectedServices),
        'shopData.selectedServices長さ': Array.isArray(shopData.selectedServices) ? shopData.selectedServices.length : 0,
        'submitData.services存在': 'services' in submitData,
        'submitData.services値': (submitData as any).services,
        'submitData.services型': typeof (submitData as any).services,
        'submitData.services配列か': Array.isArray((submitData as any).services),
        'submitData全体（JSON）': JSON.stringify(submitData).substring(0, 1000),
      });

      // 店舗を更新
      await apiClient.updateShop(shopId, submitData);
      
      // 更新成功後、sessionStorageをクリア
      try {
        sessionStorage.removeItem('shopConfirmData');
      } catch (error) {
        console.error('sessionStorageのクリアに失敗しました:', error);
      }
      
      // リダイレクト先を決定
      const fallbackRedirect = shopData.fallbackRedirect || '/shops';
      const separator = fallbackRedirect.includes('?') ? '&' : '?';
      router.push(`${fallbackRedirect}${separator}toast=${encodeURIComponent('店舗を更新しました')}`);
    } catch (error) {
      console.error('店舗の更新に失敗しました:', error);
      
      // エラーメッセージを取得
      let errorMessage = '店舗の更新に失敗しました。もう一度お試しください。';
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { status?: number; data?: { message?: string; error?: { message?: string } } } };
        if (apiError.response?.status === 409) {
          errorMessage = 'このメールアドレスは既に使用されています';
        } else if (apiError.response?.data?.error?.message) {
          errorMessage = apiError.response.data.error.message;
        } else if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      showError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (!shopData) {
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
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">店舗更新内容確認</h1>
              <p className="text-gray-600">
                入力内容を確認してください
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

        {/* 基本情報 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">基本情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">事業者</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.merchantName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗名</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.name}</p>
            </div>

            {shopData.nameKana && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">店舗名（カナ）</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.nameKana}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.phone}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.postalCode}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {shopData.prefecture}{shopData.city}{shopData.address1}{shopData.address2}
              </p>
            </div>

            {shopData.area && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">対象エリア</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.area}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">緯度</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.latitude}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">経度</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.longitude}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{getStatusLabel(shopData.status)}</p>
            </div>
          </div>
        </div>

        {/* ジャンル・利用シーン */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">ジャンル・利用シーン</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ジャンル</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.genreName}</p>
            </div>

            {shopData.selectedScenes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">利用シーン</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.selectedScenes.map(id => shopData.sceneNames[id] || id).join('、')}
                  {shopData.customSceneText && ` (${shopData.customSceneText})`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 店舗紹介・詳細情報 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">店舗紹介・詳細情報</h3>
          
          <div className="space-y-4">
            {shopData.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">店舗紹介説明</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded whitespace-pre-wrap">{shopData.description}</p>
              </div>
            )}

            {shopData.details && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細情報</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded whitespace-pre-wrap">{shopData.details}</p>
              </div>
            )}

            {shopData.selectedHolidays.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">定休日</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.selectedHolidays.map(h => h === '祝日' ? h : h === 'その他' ? `その他: ${shopData.customHolidayText}` : `${h}曜日`).join('、')}
                </p>
              </div>
            )}

            {shopData.homepageUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ホームページURL</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.homepageUrl}</p>
              </div>
            )}

            {(shopData.couponUsageStart || shopData.couponUsageEnd) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">クーポン利用時間</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.couponUsageStart} 〜 {shopData.couponUsageEnd}
                </p>
              </div>
            )}

            {shopData.couponUsageDays && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">クーポン利用可能曜日</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.couponUsageDays}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">喫煙タイプ</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{getSmokingTypeLabel(shopData.smokingType)}</p>
            </div>

            {shopData.selectedServices && shopData.selectedServices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">サービス情報</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.selectedServices.join('、')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 決済情報 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">決済情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現金</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.paymentCash ? '対応' : '非対応'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">マイディジ</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.paymentMydigi ? '対応' : '非対応'}</p>
            </div>

            {shopData.selectedCreditBrands.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">クレジットカード</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.selectedCreditBrands.filter(b => b !== 'その他').join('、')}
                  {shopData.customCreditText && ` / その他: ${shopData.customCreditText}`}
                </p>
              </div>
            )}

            {shopData.selectedQrBrands.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QRコード決済</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">
                  {shopData.selectedQrBrands.filter(s => s !== 'その他').join('、')}
                  {shopData.customQrText && ` / その他: ${shopData.customQrText}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 画像 */}
        {(shopData.existingImages.length > 0 || shopData.imagePreviews.length > 0) && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">店舗画像</h3>
            
            <div className="flex flex-wrap gap-4">
              {shopData.existingImages.map((url, index) => (
                <div key={`existing-${index}`} className="relative w-32 h-24">
                  <Image
                    src={url}
                    alt={`店舗画像 ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
              {shopData.imagePreviews.map((url, index) => (
                <div key={`preview-${index}`} className="relative w-32 h-24">
                  <Image
                    src={url}
                    alt={`新規画像 ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アカウント情報 */}
        {shopData.createAccount && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">アカウント情報</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{shopData.accountEmail}</p>
              </div>
              {!shopData.hasExistingAccount && shopData.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded">{'*'.repeat(8)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={handleModify}
          >
            更新内容を修正する
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? '更新中...' : '更新する'}
          </Button>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function ShopEditConfirmPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    }>
      <ShopEditConfirmContent />
    </Suspense>
  );
}
