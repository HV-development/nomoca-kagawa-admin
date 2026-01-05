'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { apiClient } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface MerchantConfirmData {
  email: string;
  name: string;
  nameKana: string;
  representativeNameLast: string;
  representativeNameFirst: string;
  representativeNameLastKana: string;
  representativeNameFirstKana: string;
  representativePhone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  issueAccount: boolean;
}

function MerchantConfirmContent() {
  const router = useRouter();
  const { toasts, removeToast, showError } = useToast();
  const [merchantData, setMerchantData] = useState<MerchantConfirmData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // sessionStorageからデータを取得
    try {
      const storedData = sessionStorage.getItem('merchantConfirmData');
      if (storedData) {
        const parsedData = JSON.parse(storedData) as MerchantConfirmData;
        setMerchantData(parsedData);
      } else {
        // データがない場合は入力画面に戻る
        router.push('/merchants/new');
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      router.push('/merchants/new');
    }
  }, [router]);

  const handleModify = () => {
    // sessionStorageのデータは保持したまま戻る（入力画面で再利用可能）
    router.back();
  };

  const handleRegister = async () => {
    if (!merchantData) return;
    
    setIsSubmitting(true);
    try {
      // APIスキーマに合わせてフィールドをマッピング
      const requestData = {
        accountEmail: merchantData.email,
        name: merchantData.name,
        nameKana: merchantData.nameKana,
        representativeNameLast: merchantData.representativeNameLast,
        representativeNameFirst: merchantData.representativeNameFirst,
        representativeNameLastKana: merchantData.representativeNameLastKana,
        representativeNameFirstKana: merchantData.representativeNameFirstKana,
        representativePhone: merchantData.representativePhone,
        postalCode: merchantData.postalCode,
        prefecture: merchantData.prefecture,
        city: merchantData.city,
        address1: merchantData.address1,
        address2: merchantData.address2 || undefined,
        issueAccount: merchantData.issueAccount,
      };

      await apiClient.createMerchant(requestData);
      
      // 登録成功後、sessionStorageをクリア
      try {
        sessionStorage.removeItem('merchantConfirmData');
      } catch (error) {
        console.error('sessionStorageのクリアに失敗しました:', error);
      }
      
      // 一覧画面に遷移（トーストは一覧画面で表示）
      router.push('/merchants?toast=' + encodeURIComponent('事業者を登録しました'));
    } catch (error) {
      console.error('事業者の登録に失敗しました:', error);
      
      // エラーメッセージを取得
      let errorMessage = '事業者の登録に失敗しました。もう一度お試しください。';
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
        if (apiError.response?.data?.error?.message) {
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

  if (!merchantData) {
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
              <h1 className="text-2xl font-bold text-gray-900">事業者登録内容確認</h1>
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
          <h3 className="text-lg font-medium text-gray-900 mb-6">基本情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事業者名 / 代表店舗名
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                事業者名（カナ）
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.nameKana}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名（姓）
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.representativeNameLast}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名（名）
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.representativeNameFirst}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名（姓 / カナ）
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.representativeNameLastKana}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  代表者名（名 / カナ）
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.representativeNameFirstKana}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                代表者電話番号
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.representativePhone}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                アカウント発行
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {merchantData.issueAccount ? 'アカウントを発行する（パスワード設定メールを送信）' : 'アカウントを発行しない'}
              </p>
            </div>
          </div>
        </div>

        {/* 住所情報 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-6">住所情報</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                郵便番号
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.postalCode}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                都道府県
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.prefecture}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                市区町村
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.city}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                番地以降
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.address1}</p>
            </div>

            {merchantData.address2 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  建物名 / 部屋番号
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{merchantData.address2}</p>
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-center space-x-4">
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
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function MerchantConfirmPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    }>
      <MerchantConfirmContent />
    </Suspense>
  );
}
