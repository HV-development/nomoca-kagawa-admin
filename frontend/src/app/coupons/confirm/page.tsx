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

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface CouponData {
  shopId: string;
  couponName: string;
  couponContent: string;
  couponConditions: string;
  publishStatus: string;
  imagePreview: string;
  imageUrl: string;
}

function CouponConfirmPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    const data: CouponData = {
      shopId: searchParams.get('shopId') || '',
      couponName: searchParams.get('couponName') || '',
      couponContent: searchParams.get('couponContent') || '',
      couponConditions: searchParams.get('couponConditions') || '',
      publishStatus: searchParams.get('publishStatus') || '',
      imagePreview: searchParams.get('imagePreview') || '',
      imageUrl: searchParams.get('imageUrl') || '',
    };
    setCouponData(data);
  }, [searchParams]);

  const getPublishStatusLabel = (status: string) => {
    switch (status) {
      case '1':
        return '公開する';
      case '2':
        return '公開しない';
      default:
        return '';
    }
  };

  const handleModify = () => {
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
        imageUrl: couponData.imageUrl || null,
        status: (couponData.publishStatus === '1' ? 'approved' : 'pending') as CouponStatus,
        isPublic: couponData.publishStatus === '1'
      };
      
      await apiClient.createCoupon(createData);
      showSuccess('クーポンを登録しました');
      setTimeout(() => {
        router.push('/coupons');
      }, 1500);
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
                <span className="font-medium text-gray-900">管理者太郎</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公開 / 非公開
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{getPublishStatusLabel(couponData.publishStatus)}</p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center space-x-4 pt-6 mt-6 border-t border-gray-200">
            <Button
              variant="outline"
              size="lg"
              onClick={handleModify}
              className="px-8"
            >
              登録内容を修正する
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleRegister}
              disabled={isSubmitting}
              className="px-8"
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
