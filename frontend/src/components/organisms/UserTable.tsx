'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

interface User {
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
}

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  error: string | null;
  isOperatorRole: boolean;
  isDownloadingCSV: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onDownloadAllCSV: () => void;
}

// 日付を表示用にフォーマット（YYYY/MM/DD形式）
const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export default function UserTable({
  users,
  isLoading,
  error,
  isOperatorRole,
  isDownloadingCSV,
  pagination,
  onDownloadAllCSV,
}: UserTableProps) {
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
        return 'ブロンズ';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          ユーザー一覧 ({pagination.total}件)
        </h3>
        <Button
          variant="outline"
          onClick={onDownloadAllCSV}
          disabled={isDownloadingCSV || users.length === 0}
          className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
        >
          {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px', minWidth: '140px' }}>
                アクション
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ニックネーム
              </th>
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  郵便番号
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  住所
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  生年月日
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  性別
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ランク
              </th>
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録店舗
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>
                  <div className="flex justify-center gap-2 items-center">
                    <Link href={`/users/${user.id}`}>
                      <button
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] flex-shrink-0"
                        title="詳細"
                        style={{ width: 'auto', height: 'auto' }}
                      >
                        <Image
                          src="/info.png"
                          alt="詳細"
                          width={32}
                          height={32}
                          className="object-contain"
                          style={{ width: '32px', height: '32px', aspectRatio: '1/1', flexShrink: 0, display: 'block' }}
                        />
                      </button>
                    </Link>
                    {!isOperatorRole && (
                      <Link href={`/users/${user.id}/edit`}>
                        <button
                          className="p-2 text-green-600 hover:text-green-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] flex-shrink-0"
                          title="編集"
                          style={{ width: 'auto', height: 'auto' }}
                        >
                          <Image
                            src="/edit.svg"
                            alt="編集"
                            width={24}
                            height={24}
                            className="object-contain"
                            style={{ width: '24px', height: '24px', flexShrink: 0, display: 'block' }}
                          />
                        </button>
                      </Link>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
                </td>
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.postalCode}</div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.prefecture}{user.city}{user.address}
                    </div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.birthDate}</div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getGenderLabel(user.gender)}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{getRankLabel(user.rank)}</div>
                </td>
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.registeredStore}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDateForDisplay(user.registeredAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">データを読み込み中...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-12">
          <Icon name="users" size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">エラーが発生しました</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      )}

      {!isLoading && !error && users.length === 0 && (
        <div className="text-center py-12">
          <Icon name="users" size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">ユーザーが見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

