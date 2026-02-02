'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import IconButton from '@/components/atoms/IconButton';
import Icon from '@/components/atoms/Icon';
import Checkbox from '@/components/atoms/Checkbox';
import type { CouponWithShop } from '@hv-development/schemas';

interface CouponTableProps {
  coupons: CouponWithShop[];
  isLoading: boolean;
  isAdminAccount: boolean;
  shopId?: string;
  selectedCoupons: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isDownloadingCSV: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onToggleAll: (checked: boolean) => void;
  onToggleCoupon: (couponId: string, checked: boolean) => void;
  onDownloadAllCSV: () => void;
  onStatusChange: (couponId: string, status: string) => void;
  onPublicStatusChange: (couponId: string, isPublic: boolean) => void;
}

export default function CouponTable({
  coupons,
  isLoading,
  isAdminAccount,
  shopId,
  selectedCoupons,
  isAllSelected,
  isIndeterminate,
  isDownloadingCSV,
  pagination,
  onToggleAll,
  onToggleCoupon,
  onDownloadAllCSV,
  onStatusChange,
  onPublicStatusChange,
}: CouponTableProps) {
  const getStatusSelectColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700';
      case 'approved':
        return 'text-green-700';
      case 'suspended':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  const getPublicStatusSelectColor = (isPublic: boolean) => {
    if (isPublic) {
      return 'text-blue-700';
    } else {
      return 'text-red-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-500">データを読み込み中...</p>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          クーポン一覧 ({pagination.total}件)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onDownloadAllCSV}
            disabled={isDownloadingCSV || coupons.length === 0}
            className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link href={shopId ? `/coupons/new?shopId=${shopId}` : '/coupons/new'}>
            <Button variant="outline" className="bg-white text-green-600 border-green-600 hover:bg-green-50">
              <span className="mr-2">+</span>
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onToggleAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                アクション
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                事業者名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                店舗名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                クーポン名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                承認ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                公開ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                作成日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                更新日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={selectedCoupons.has(coupon.id)}
                    onChange={(checked) => onToggleCoupon(coupon.id, checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[120px]">
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/coupons/${coupon.id}/edit`}>
                      <IconButton color="green" title="編集">
                        <Image src="/edit.svg" alt="編集" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                      </IconButton>
                    </Link>
                    <Link href={`/coupons/${coupon.id}/history`}>
                      <IconButton color="orange" title="利用履歴">
                        <Image src="/history.png" alt="利用履歴" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                      </IconButton>
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{coupon.shop?.merchant?.name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{coupon.shop?.name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                  <div className="text-sm text-gray-900">{coupon.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                  {isAdminAccount ? (
                    <select
                      value={coupon.status}
                      onChange={(e) => onStatusChange(coupon.id, e.target.value)}
                      className={`text-sm font-medium rounded-lg px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 w-full min-w-[120px] ${getStatusSelectColor(coupon.status)}`}
                    >
                      <option value="pending">申請中</option>
                      <option value="approved">承認済み</option>
                      <option value="suspended">停止中</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${getStatusSelectColor(coupon.status)}`}>
                      {coupon.status === 'pending' ? '申請中' : coupon.status === 'approved' ? '承認済み' : '停止中'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                  <select
                    value={coupon.isPublic ? 'true' : 'false'}
                    onChange={(e) => onPublicStatusChange(coupon.id, e.target.value === 'true')}
                    disabled={coupon.status !== 'approved'}
                    className={`text-sm font-medium rounded-lg px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 w-full min-w-[100px] ${getPublicStatusSelectColor(coupon.isPublic)} ${coupon.status !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="true">公開中</option>
                    <option value="false">非公開</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[160px]">
                  <div className="text-sm text-gray-900">{new Date(coupon.createdAt).toLocaleString('ja-JP')}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{new Date(coupon.updatedAt).toLocaleString('ja-JP')}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && coupons.length === 0 && (
        <div className="text-center py-12">
          <Icon name="coupon" size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">クーポンが見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

