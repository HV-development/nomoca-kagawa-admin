'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

interface CouponUsage {
  id: string;
  usageId: string;
  couponId: string;
  couponName: string;
  shopId: string;
  shopName: string;
  nickname?: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  usedAt: string;
}

interface CouponHistoryTableProps {
  usages: CouponUsage[];
  isLoading: boolean;
  isSysAdmin: boolean;
  isDownloadingCSV: boolean;
  pathname: string;
  total: number;
  onDownloadAllCSV: () => void;
}

// 日時を表示用にフォーマット（YYYY/MM/DD HH:MM形式）
const formatDateTimeForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

export default function CouponHistoryTable({
  usages,
  isLoading,
  isSysAdmin,
  isDownloadingCSV,
  pathname,
  total,
  onDownloadAllCSV,
}: CouponHistoryTableProps) {
  const getGenderLabel = (gender?: string) => {
    if (!gender) return '未回答';
    switch (gender) {
      case 'male':
        return '男性';
      case 'female':
        return '女性';
      case 'other':
        return 'その他';
      default:
        return '未回答';
    }
  };

  const isCouponDetailView = pathname.includes('/coupons/') && pathname.includes('/history');
  const isUserHistoryView = pathname.includes('/users/') && pathname.includes('/coupon-history');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {isCouponDetailView
            ? 'クーポン利用履歴'
            : isUserHistoryView
              ? 'クーポン利用履歴'
              : 'クーポン利用履歴一覧'} ({total}件)
        </h3>
        <Button
          variant="outline"
          onClick={onDownloadAllCSV}
          disabled={isDownloadingCSV || total === 0}
          className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
        >
          {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                クーポン利用ID
              </th>
              {!isCouponDetailView && !isUserHistoryView && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    クーポンID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    クーポン名
                  </th>
                </>
              )}
              {(isCouponDetailView || isUserHistoryView) && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    クーポンID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    クーポン名
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                店舗名
              </th>
              {isSysAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  メールアドレス
                </th>
              )}
              {isSysAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  ニックネーム
                </th>
              )}
              {isSysAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  性別
                </th>
              )}
              {isSysAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  生年月日
                </th>
              )}
              {isSysAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  住所
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                利用日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usages.map((usage) => (
              <tr key={usage.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{usage.id}</div>
                </td>
                {!isCouponDetailView && !isUserHistoryView && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usage.couponId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usage.couponName}</div>
                    </td>
                  </>
                )}
                {(isCouponDetailView || isUserHistoryView) && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usage.couponId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usage.couponName}</div>
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{usage.shopName}</div>
                </td>
                {isSysAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usage.email || '-'}</div>
                  </td>
                )}
                {isSysAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usage.nickname || '-'}</div>
                  </td>
                )}
                {isSysAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getGenderLabel(usage.gender)}</div>
                  </td>
                )}
                {isSysAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usage.birthDate || '-'}</div>
                  </td>
                )}
                {isSysAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usage.address || '-'}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDateTimeForDisplay(usage.usedAt)}</div>
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

      {!isLoading && usages.length === 0 && (
        <div className="text-center py-12">
          <Icon name="history" size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">利用履歴が見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

