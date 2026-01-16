'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { apiClient } from '@/lib/api';
import type { CouponUpdateRequest } from '@hv-development/schemas';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { useAuth } from '@/components/contexts/auth-context';
import { compressImageFile } from '@/utils/imageUtils';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface CouponData {
  couponId: string;
  couponName: string;
  couponContent: string;
  couponConditions: string;
  drinkType: string;
  imagePreview: string;
  imageUrl: string;
}

function CouponEditConfirmPageContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const couponId = params.id as string;
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    // sessionStorageからデータを取得（画像データを含む）
    try {
      const storedData = sessionStorage.getItem('couponEditConfirmData');
      if (storedData) {
        const parsedData = JSON.parse(storedData) as CouponData;
        setCouponData(parsedData);
      } else {
        // sessionStorageにデータがない場合、URLパラメータから取得（後方互換性のため）
        const data: CouponData = {
          couponId: couponId,
          couponName: searchParams.get('couponName') || '',
          couponContent: searchParams.get('couponContent') || '',
          couponConditions: searchParams.get('couponConditions') || '',
          drinkType: searchParams.get('drinkType') || '',
          imagePreview: searchParams.get('imagePreview') || '',
          imageUrl: searchParams.get('imageUrl') || '',
        };
        setCouponData(data);
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      // エラー時は空のデータを設定
      setCouponData({
        couponId: couponId,
        couponName: '',
        couponContent: '',
        couponConditions: '',
        drinkType: '',
        imagePreview: '',
        imageUrl: '',
      });
    }
  }, [searchParams, couponId]);

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
    router.back();
  };

  const handleUpdate = async () => {
    if (!couponData) return;
    
    setIsSubmitting(true);
    try {
      // 新しく追加された画像をアップロード
      let uploadedImageUrl: string | undefined = undefined;
      if (couponData.imagePreview && couponData.imagePreview.startsWith('data:')) {
        try {
          // クーポン情報を取得してshopIdとmerchantIdを取得
          const couponInfo = await apiClient.getCoupon(couponId) as { shopId?: string; shop?: { id: string; merchantId?: string; merchant?: { id: string } } };
          const shopId = couponInfo.shopId || couponInfo.shop?.id;
          const merchantId = couponInfo.shop?.merchantId || couponInfo.shop?.merchant?.id;
          
          if (!shopId || !merchantId) {
            throw new Error('店舗IDまたは事業者IDが取得できませんでした');
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
          uploadFormData.append('shopId', shopId);
          uploadFormData.append('merchantId', merchantId);
          uploadFormData.append('couponId', couponId);
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
            throw new Error(`${message} (status: ${uploadResponse.status})`);
          }
          
          const uploadData = await uploadResponse.json();
          uploadedImageUrl = uploadData.url;
        } catch (uploadError) {
          console.error('画像のアップロードに失敗しました:', uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : '画像のアップロードに失敗しました';
          showError(`画像のアップロードに失敗しました: ${errorMessage}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // バリデーションエラー回避のため、URI形式の場合のみ送信
      const previewHttpUrl = couponData.imagePreview?.startsWith('http') ? couponData.imagePreview : undefined;
      const imageUrl = uploadedImageUrl
        ?? (couponData.imageUrl && couponData.imageUrl.trim() !== '' ? couponData.imageUrl : undefined)
        ?? previewHttpUrl;
      const shouldDeleteImage = !imageUrl && !couponData.imagePreview;
      
      const updateData: Partial<CouponUpdateRequest> = {
        title: couponData.couponName,
        description: couponData.couponContent || undefined,
        conditions: couponData.couponConditions || undefined,
        drinkType: (couponData.drinkType === 'alcohol' || couponData.drinkType === 'soft_drink' || couponData.drinkType === 'other') ? couponData.drinkType : undefined,
      };
      
      if (imageUrl) {
        updateData.imageUrl = imageUrl;
      } else if (shouldDeleteImage) {
        updateData.imageUrl = null;
      }
      
      await apiClient.updateCoupon(couponId, updateData);
      
      // 更新成功後、sessionStorageをクリア
      try {
        sessionStorage.removeItem('couponEditConfirmData');
      } catch (error) {
        console.error('sessionStorageのクリアに失敗しました:', error);
      }
      
      // 一覧画面に遷移（トーストは一覧画面で表示）
      router.push('/coupons?toast=' + encodeURIComponent('クーポン情報を更新しました'));
    } catch (error) {
      console.error('クーポンの更新に失敗しました:', error);
      showError('クーポンの更新に失敗しました。もう一度お試しください。');
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
            <h1 className="text-2xl font-bold text-gray-900">クーポン変更内容確認</h1>
            <p className="text-gray-600">
              変更内容を確認してください
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
              変更内容を修正する
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? '更新中...' : '変更する'}
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function CouponEditConfirmPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CouponEditConfirmPageContent />
    </Suspense>
  );
}
