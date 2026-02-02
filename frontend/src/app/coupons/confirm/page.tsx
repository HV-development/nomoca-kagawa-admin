'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { apiClient } from '@/lib/api';
import type { CouponCreateRequest, CouponStatus } from '@hv-development/schemas';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { compressImageFile } from '@/utils/imageUtils';
import { useAuth } from '@/components/contexts/auth-context';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface CouponData {
  shopId: string;
  couponName: string;
  couponContent: string;
  couponConditions: string;
  drinkType: string;
  publishStatus: string;
  imagePreview: string;
  imageUrl: string;
}

function CouponConfirmPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, showError } = useToast();

  useEffect(() => {
    // sessionStorageからデータを取得（画像データを含む）
    try {
      const storedData = sessionStorage.getItem('couponConfirmData');
      if (storedData) {
        const parsedData = JSON.parse(storedData) as CouponData;
        setCouponData(parsedData);
      } else {
        // sessionStorageにデータがない場合、URLパラメータから取得（後方互換性のため）
        const data: CouponData = {
          shopId: searchParams.get('shopId') || '',
          couponName: searchParams.get('couponName') || '',
          couponContent: searchParams.get('couponContent') || '',
          couponConditions: searchParams.get('couponConditions') || '',
          drinkType: searchParams.get('drinkType') || '',
          publishStatus: searchParams.get('publishStatus') || '',
          imagePreview: searchParams.get('imagePreview') || '',
          imageUrl: searchParams.get('imageUrl') || '',
        };
        setCouponData(data);
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      // エラー時は空のデータを設定
      setCouponData({
        shopId: '',
        couponName: '',
        couponContent: '',
        couponConditions: '',
        drinkType: '',
        publishStatus: '',
        imagePreview: '',
        imageUrl: '',
      });
    }
  }, [searchParams]);

  const getDrinkTypeLabel = (drinkType: string) => {
    switch (drinkType) {
      case 'alcohol':
        return 'アルコール';
      case 'soft_drink':
        return 'ソフトドリンク';
      case 'other':
        return 'その他';
      default:
        return '';
    }
  };

  const handleModify = () => {
    // sessionStorageのデータは保持したまま戻る（修正画面で再利用可能）
    router.back();
  };

  const handleRegister = async () => {
    if (!couponData) return;
    
    setIsSubmitting(true);
    try {
      const createData: CouponCreateRequest = {
        shopId: couponData.shopId,
        title: couponData.couponName,
        description: couponData.couponContent || null,
        conditions: couponData.couponConditions || null,
        drinkType: (couponData.drinkType === 'alcohol' || couponData.drinkType === 'soft_drink' || couponData.drinkType === 'other') ? couponData.drinkType : null,
        imageUrl: couponData.imageUrl || null,
        status: 'pending' as CouponStatus,
        isPublic: false
      };
      
      const createdCoupon = await apiClient.createCoupon(createData) as { id: string };
      
      // 画像をアップロード
      if (couponData.imagePreview && couponData.imagePreview.startsWith('data:') && createdCoupon.id) {
        try {
          // 店舗情報を取得してmerchantIdを取得
          const shopData = await apiClient.getShop(couponData.shopId) as { merchantId?: string; merchant?: { id: string } };
          const merchantId = shopData.merchantId || shopData.merchant?.id;
          
          if (!merchantId) {
            throw new Error('事業者IDが取得できませんでした');
          }
          
          // data:URLから画像を取得してFileオブジェクトに変換
          const base64Data = couponData.imagePreview.split(',')[1];
          const mimeType = couponData.imagePreview.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const file = new File([blob], 'coupon-image.jpg', { type: mimeType });
          
          // 画像を圧縮
          const fileForUpload = await compressImageFile(file, {
            maxBytes: 9.5 * 1024 * 1024,
            maxWidth: 2560,
            maxHeight: 2560,
            initialQuality: 0.9,
            minQuality: 0.6,
            qualityStep: 0.1,
          });
          
          // タイムスタンプを生成
          const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
          
          // FormDataを作成
          const uploadFormData = new FormData();
          uploadFormData.append('image', fileForUpload);
          uploadFormData.append('type', 'coupon');
          uploadFormData.append('shopId', couponData.shopId);
          uploadFormData.append('merchantId', merchantId);
          uploadFormData.append('couponId', createdCoupon.id);
          uploadFormData.append('timestamp', timestamp);
          
          // 画像をアップロード
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            const message = errorData?.error || errorData?.message || '画像のアップロードに失敗しました';
            console.error('❌ Upload failed:', uploadResponse.status, errorData);
            throw new Error(message);
          }
          
          const uploadData = await uploadResponse.json();
          
          // アップロードされた画像URLをクーポンデータに含めて更新
          try {
            await apiClient.updateCoupon(createdCoupon.id, {
              imageUrl: uploadData.url,
            });
            console.log('✅ クーポン画像を更新しました:', uploadData.url);
          } catch (updateError) {
            console.error('❌ クーポン画像の更新に失敗しました:', updateError);
            // 画像アップロードは成功しているが、クーポンデータの更新に失敗した場合
            showError('画像のアップロードは完了しましたが、クーポンデータの更新に失敗しました。管理者にお問い合わせください。');
          }
        } catch (uploadError) {
          console.error('画像のアップロードに失敗しました:', uploadError);
          // 画像アップロードが失敗してもクーポン作成は成功しているので、エラーを表示して続行
          const errorMessage = uploadError instanceof Error ? uploadError.message : '画像のアップロードに失敗しました';
          showError(`クーポンは作成されましたが、${errorMessage}`);
        }
      }
      
      // 登録成功後、sessionStorageをクリア
      try {
        sessionStorage.removeItem('couponConfirmData');
      } catch (error) {
        console.error('sessionStorageのクリアに失敗しました:', error);
      }
      
      // 一覧画面に遷移（トーストは一覧画面で表示）
      router.push('/coupons?toast=' + encodeURIComponent('クーポンを登録しました'));
    } catch (error) {
      console.error('クーポンの作成に失敗しました:', error);
      showError('クーポンの作成に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  if (!couponData) {
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
            <h1 className="text-2xl font-bold text-gray-900">クーポン登録内容確認</h1>
            <p className="text-gray-600">
              入力内容を確認してください
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

        {/* 確認内容 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クーポン名
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{couponData.couponName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クーポン内容
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{couponData.couponContent}</p>
            </div>

            {couponData.couponConditions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  利用条件
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{couponData.couponConditions}</p>
              </div>
            )}

            {couponData.drinkType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ドリンク種別
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{getDrinkTypeLabel(couponData.drinkType)}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クーポン画像
              </label>
              <div className="bg-gray-50 p-2 rounded">
                {couponData.imagePreview ? (
                  <div className="relative w-64 h-48">
                    <Image
                      src={couponData.imagePreview}
                      alt="クーポン画像プレビュー"
                      fill
                      className="object-cover rounded-lg"
                      unoptimized={couponData.imagePreview.startsWith('blob:') || couponData.imagePreview.startsWith('data:')}
                    />
                  </div>
                ) : (
                  <p className="text-gray-500">画像がアップロードされていません</p>
                )}
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center space-x-4 pt-6 mt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleModify}
            >
              登録内容を修正する
            </Button>
            <Button
              variant="primary"
              onClick={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function CouponConfirmPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CouponConfirmPageContent />
    </Suspense>
  );
}
