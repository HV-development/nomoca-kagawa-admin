'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

type ContractStatusValue = number | string | null | undefined;

interface ApiUser {
  id?: string;
  nickname?: string;
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  address?: string | null;
  address1?: string | null;
  address2?: string | null;
  birthDate?: string | null;
  gender?: string | number | null;
  saitamaAppId?: string | null;
  externalId?: string | null;
  rank?: number | string | null;
  registeredStore?: string | null;
  storeName?: string | null;
  registeredAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  contractStatus?: ContractStatusValue;
  status?: ContractStatusValue;
  phone?: string | null;
  email?: string | null;
}

interface UserDetailView {
  id: string;
  nickname: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  birthDate: string;
  gender: number;
  saitamaAppId: string;
  rank: number;
  registeredStore: string;
  registeredAt: string;
  contractStatus: ContractStatusValue;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

const displayValue = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '-';
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, '/');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatDate(value);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const parseGender = (value: ApiUser['gender']): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'male' || normalized === 'man') return 1;
    if (normalized === 'female' || normalized === 'woman') return 2;
    if (normalized === 'unknown' || normalized === 'other') return 3;
  }
  return 0;
};

const parseRank = (value: ApiUser['rank']): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseContractStatus = (value: ContractStatusValue): ContractStatusValue => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return null;
};

const toUserDetailView = (data: ApiUser, isOperatorRole: boolean): UserDetailView => {
  const contractStatus = parseContractStatus(data.contractStatus ?? data.status);
  const gender = parseGender(data.gender);
  const rank = parseRank(data.rank);

  const addressParts = [
    data.address ?? '',
    data.address1 ?? '',
    data.address2 ?? '',
  ].filter(Boolean);

  const view: UserDetailView = {
    id: data.id ?? '',
    nickname: data.nickname ?? '',
    postalCode: data.postalCode ?? '',
    prefecture: data.prefecture ?? '',
    city: data.city ?? '',
    address: addressParts.join(''),
    birthDate: formatDate(data.birthDate),
    gender,
    saitamaAppId: data.saitamaAppId ?? data.externalId ?? '',
    rank,
    registeredStore: data.registeredStore ?? data.storeName ?? '',
    registeredAt: formatDateTime(data.registeredAt ?? data.createdAt),
    contractStatus,
    phone: data.phone ?? '',
    email: data.email ?? '',
    createdAt: formatDateTime(data.createdAt),
    updatedAt: formatDateTime(data.updatedAt),
  };

  if (isOperatorRole) {
    return {
      ...view,
      postalCode: '',
      prefecture: '',
      city: '',
      address: '',
      birthDate: '',
      gender: 0,
      saitamaAppId: '',
    };
  }

  return view;
};

export default function UserDetailPage() {
  const params = useParams<{ id?: string }>();
  const userId = params?.id ?? '';
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const isOperatorRole = auth?.user?.accountType === 'admin' && auth?.user?.role === 'operator';

  const [user, setUser] = useState<UserDetailView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getUser(userId);
      const payload =
        data && typeof data === 'object' && 'user' in data
          ? (data as { user: ApiUser }).user
          : (data as ApiUser | null);

      if (!payload) {
        setUser(null);
        setError(null);
        return;
      }

      setUser(toUserDetailView(payload, !!isOperatorRole));
    } catch (err) {
      const errorObj = err as Error & { response?: { status?: number } };
      if (errorObj?.response?.status === 404) {
        setUser(null);
        setError(null);
      } else {
        setUser(null);
        setError(errorObj?.message || 'ユーザー詳細の取得に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isOperatorRole]);

  useEffect(() => {
    if (auth?.isLoading) {
      return;
    }
    if (!auth?.user) {
      return;
    }
    void fetchUser();
  }, [auth?.isLoading, auth?.user, fetchUser]);

  const getGenderLabel = (gender: number) => {
    switch (gender) {
      case 1:
        return '男性';
      case 2:
        return '女性';
      case 3:
        return '未回答';
      default:
        return '未回答';
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return 'ブロンズ';
      case 2:
        return 'シルバー';
      case 3:
        return 'ゴールド';
      case 4:
        return 'ダイヤモンド';
      default:
        return 'ランク未設定';
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-orange-100 text-orange-800';
      case 2:
        return 'bg-gray-100 text-gray-800';
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case 4:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractStatusLabel = (status: ContractStatusValue) => {
    if (typeof status === 'number') {
      switch (status) {
        case 1:
          return '契約中（サブスクリプション契約）';
        case 2:
          return '契約中（サブスクリプション未契約）';
        case 3:
          return '解約';
        default:
          return '契約ステータス未設定';
      }
    }

    if (typeof status === 'string') {
      switch (status) {
        case 'active':
          return '契約中';
        case 'inactive':
          return '未契約';
        case 'terminated':
          return '解約済み';
        default:
          return status;
      }
    }

    return '契約ステータス未設定';
  };

  const getContractStatusColor = (status: ContractStatusValue) => {
    if (typeof status === 'number') {
      switch (status) {
        case 1:
          return 'bg-green-100 text-green-800';
        case 2:
          return 'bg-yellow-100 text-yellow-800';
        case 3:
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    if (typeof status === 'string') {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'inactive':
          return 'bg-yellow-100 text-yellow-800';
        case 'terminated':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    return 'bg-gray-100 text-gray-800';
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

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">ユーザー詳細の取得に失敗しました</h3>
          <p className="text-gray-500">{error}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              戻る
            </Button>
            <Button variant="primary" onClick={fetchUser}>
              再試行
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">ユーザーが見つかりません</h3>
          <p className="text-gray-500 mb-4">指定されたユーザーは存在しません。</p>
          <Link href="/users">
            <Button variant="primary">ユーザー一覧に戻る</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const renderTableRow = (
    label: string,
    value: React.ReactNode,
    options?: { badge?: boolean; valueClassName?: string }
  ) => (
    <tr className="border-b border-gray-300">
      <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">{label}</td>
      <td className={`py-3 px-4 text-gray-900 ${options?.valueClassName ?? ''}`}>
        {options?.badge ? (
          <span className="inline-flex items-center">{value}</span>
        ) : (
          value
        )}
      </td>
    </tr>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ユーザー詳細</h1>
              <p className="text-gray-600 mt-1">ユーザーの詳細情報を確認できます</p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
              <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  {renderTableRow('ニックネーム', displayValue(user.nickname))}
                  {renderTableRow(
                    'ランク',
                    <span className={`px-3 py-2 rounded-lg text-sm font-medium ${getRankBadgeColor(user.rank)}`}>
                      {getRankLabel(user.rank)}
                    </span>,
                    { badge: true }
                  )}
                  {renderTableRow(
                    '契約ステータス',
                    <span
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${getContractStatusColor(
                        user.contractStatus
                      )}`}
                    >
                      {getContractStatusLabel(user.contractStatus)}
                    </span>,
                    { badge: true }
                  )}
                  {renderTableRow('登録日', displayValue(user.registeredAt))}
                  {renderTableRow('登録店舗', displayValue(user.registeredStore))}
                  {renderTableRow('さいたまアプリID', displayValue(user.saitamaAppId))}
                </tbody>
              </table>
            </section>

            {!isOperatorRole && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">個人情報</h2>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    {renderTableRow('郵便番号', displayValue(user.postalCode))}
                    {renderTableRow('都道府県', displayValue(user.prefecture))}
                    {renderTableRow('市区町村', displayValue(user.city))}
                    {renderTableRow('番地・建物名', displayValue(user.address))}
                    {renderTableRow('生年月日', displayValue(user.birthDate))}
                    {renderTableRow('性別', getGenderLabel(user.gender))}
                  </tbody>
                </table>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  {!isOperatorRole &&
                    renderTableRow('メールアドレス', (
                      <span className="break-words">{displayValue(user.email)}</span>
                    ))}
                  {renderTableRow('電話番号', displayValue(user.phone))}
                  {renderTableRow('登録日時', displayValue(user.createdAt))}
                  {renderTableRow('更新日時', displayValue(user.updatedAt))}
                </tbody>
              </table>
            </section>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/users">
            <Button variant="outline" className="px-6 py-3 border-2 border-green-600 text-green-600 bg-white hover:bg-green-50 transition-colors font-medium">
              ユーザー一覧に戻る
            </Button>
          </Link>
          <Link href={`/users/${user.id}/coupon-history`}>
            <Button variant="primary" className="px-6 py-3 border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700 transition-colors font-medium">
              クーポン利用履歴
            </Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}