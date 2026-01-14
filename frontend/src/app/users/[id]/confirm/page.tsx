'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { useAuth } from '@/components/contexts/auth-context';

interface UserData {
  nickname: string;
  email: string;
  postalCode: string;
  address: string;
  birthDate: string;
  gender: string;
  saitamaAppId: string;
}

export default function UserEditConfirmPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const userId = params.id as string;
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const [userData, setUserData] = useState<UserData | null>(null);
  const { toasts, removeToast, showSuccess } = useToast();

  useEffect(() => {
    const data: UserData = {
      nickname: searchParams.get('nickname') || '',
      email: searchParams.get('email') || '',
      postalCode: searchParams.get('postalCode') || '',
      address: searchParams.get('address') || '',
      birthDate: searchParams.get('birthDate') || '',
      gender: searchParams.get('gender') || '',
      saitamaAppId: searchParams.get('saitamaAppId') || '',
    };
    setUserData(data);
  }, [searchParams]);

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case '1':
        return '男性';
      case '2':
        return '女性';
      case '3':
        return '未回答';
      default:
        return '未回答';
    }
  };

  const handleModify = () => {
    // ユーザー編集画面に戻る（データを保持）
    const queryParams = new URLSearchParams({
      nickname: userData?.nickname || '',
      email: userData?.email || '',
      postalCode: userData?.postalCode || '',
      address: userData?.address || '',
      birthDate: userData?.birthDate || '',
      gender: userData?.gender || '',
      saitamaAppId: userData?.saitamaAppId || '',
    });
    
    window.location.href = `/users/${userId}/edit?${queryParams.toString()}`;
  };

  const handleUpdate = () => {
    // 実際の更新処理（APIコール等）
    showSuccess('ユーザー情報を更新しました');
    // 更新後はユーザー一覧画面に遷移
    setTimeout(() => {
      window.location.href = '/users';
    }, 1500);
  };

  if (!userData) {
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
            <h1 className="text-2xl font-bold text-gray-900">ユーザー変更内容確認</h1>
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
                ニックネーム
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{userData.nickname}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{userData.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                郵便番号
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{userData.postalCode}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{userData.address}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                生年月日
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{userData.birthDate}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性別
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{getGenderLabel(userData.gender)}</p>
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
              変更内容を修正する
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleUpdate}
              className="px-8"
            >
              変更する
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}