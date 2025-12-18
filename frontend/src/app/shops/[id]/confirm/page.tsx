'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import ToastContainer from '@/components/molecules/toast-container';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ShopDetailResponse } from '@hv-development/schemas';

export default function ShopConfirmPage() {
  const params = useParams();
  const shopId = params.id as string;
  
  const [shop, setShop] = useState<ShopDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showError } = useToast();

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchShop = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.getShop(shopId);
        
        // コンポーネントがマウントされている場合のみ状態を更新
        if (isMounted) {
          setShop(data as ShopDetailResponse);
        }
      } catch (err: unknown) {
        // アボート時のエラーは無視
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        if (isMounted) {
          console.error('Failed to fetch shop:', err);
          setError(err instanceof Error ? err.message : '店舗データの取得に失敗しました');
          showError('店舗データの取得に失敗しました');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (shopId) {
      fetchShop();
    }

    // クリーンアップ: コンポーネントのアンマウント時または再実行時にリクエストをキャンセル
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [shopId, showError]);

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      active: '営業中',
      inactive: '休業中',
      suspended: '停止中',
    };
    return statusLabels[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !shop) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600">{error || '店舗が見つかりません'}</div>
            <Link href="/shops">
              <Button variant="secondary" className="mt-4">
                店舗一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">店舗情報確認</h1>
            <p className="text-gray-600">{shop.name}</p>
          </div>
          <div className="flex space-x-3">
            <Link href={`/shops/${shop.id}/edit`}>
              <Button variant="primary">
                編集
              </Button>
            </Link>
            <Link href={`/shops/${shop.id}`}>
              <Button variant="secondary">
                詳細
              </Button>
            </Link>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗名</label>
              <div className="text-sm text-gray-900">{shop.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗名（カナ）</label>
              <div className="text-sm text-gray-900">{shop.nameKana || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <div className="text-sm text-gray-900">{shop.accountEmail || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <div className="text-sm text-gray-900">{shop.phone}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
              <div className="text-sm text-gray-900">{shop.postalCode ? `〒${shop.postalCode}` : '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <div className="text-sm text-gray-900">{shop.address || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">緯度</label>
              <div className="text-sm text-gray-900">{shop.latitude || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">経度</label>
              <div className="text-sm text-gray-900">{shop.longitude || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(shop.status)}`}>
                {getStatusLabel(shop.status)}
              </span>
            </div>
          </div>
        </div>

        {/* 営業情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">営業情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">詳細情報</label>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{shop.details || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">定休日</label>
              <div className="text-sm text-gray-900">{shop.holidays || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">喫煙タイプ</label>
              <div className="text-sm text-gray-900">{shop.smokingType || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">利用シーン</label>
              <div className="text-sm text-gray-900">
                {shop.scenes && Array.isArray(shop.scenes) 
                  ? shop.scenes.map(s => s.name).join(', ')
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 決済情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">決済情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">サイコイン決済</label>
              <div className="text-sm text-gray-900">{shop.paymentSaicoin ? '対応' : '非対応'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">たまぽん決済</label>
              <div className="text-sm text-gray-900">{shop.paymentTamapon ? '対応' : '非対応'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現金決済</label>
              <div className="text-sm text-gray-900">{shop.paymentCash ? '対応' : '非対応'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">クレジット決済</label>
              <div className="text-sm text-gray-900">{shop.paymentCredit || '-'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QRコード決済</label>
              <div className="text-sm text-gray-900">{shop.paymentCode || '-'}</div>
            </div>
          </div>
        </div>

        {/* 加盟店情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">加盟店情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">加盟店名</label>
              <div className="text-sm text-gray-900">{shop.merchant.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
              <div className="text-sm text-gray-900">{shop.merchant.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者メール</label>
              <div className="text-sm text-gray-900">{shop.merchant.account.email}</div>
            </div>
          </div>
        </div>

        {/* システム情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">システム情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作成日時</label>
              <div className="text-sm text-gray-900">{new Date(shop.createdAt).toLocaleString('ja-JP')}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">更新日時</label>
              <div className="text-sm text-gray-900">{new Date(shop.updatedAt).toLocaleString('ja-JP')}</div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-center space-x-3">
          <Link href="/shops">
            <Button variant="secondary">
              店舗一覧に戻る
            </Button>
          </Link>
          <Link href={`/shops/${shop.id}/edit`}>
            <Button variant="primary">
              編集する
            </Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
