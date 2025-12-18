'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import Checkbox from '@/components/atoms/Checkbox';
import { statusLabels, statusOptions } from '@/lib/constants/shop';
import type { Shop } from '@hv-development/schemas';

interface ShopTableProps {
  shops: Shop[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  selectedShops: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isLoading: boolean;
  isDownloadingCSV: boolean;
  isMerchantAccount: boolean;
  isShopAccount: boolean;
  merchantId?: string;
  encodedReturnTo: string;
  onToggleAll: (checked: boolean) => void;
  onToggleShop: (shopId: string, checked: boolean) => void;
  onStatusChange: (shopId: string, status: string) => void;
  onDownloadAllCSV: () => void;
  getStatusColor: (status: string) => string;
}

function ShopTable({
  shops,
  pagination,
  selectedShops,
  isAllSelected,
  isIndeterminate,
  isLoading,
  isDownloadingCSV,
  isMerchantAccount,
  isShopAccount,
  merchantId,
  encodedReturnTo,
  onToggleAll,
  onToggleShop,
  onStatusChange,
  onDownloadAllCSV,
  getStatusColor,
}: ShopTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          店舗一覧 ({pagination.total}件)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onDownloadAllCSV}
            disabled={isDownloadingCSV || shops.length === 0}
            className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link
            href={{
              pathname: merchantId ? `/merchants/${merchantId}/shops/new` : '/shops/new',
              query: { returnTo: encodedReturnTo },
            }}
          >
            <Button variant="outline" className="bg-white text-green-600 border-green-600 hover:bg-green-50 cursor-pointer">
              <span className="mr-2">+</span>
              新規登録
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50">
            <tr>
              {!isMerchantAccount && !isShopAccount && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={onToggleAll}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                アクション
              </th>
              {!merchantId && !isMerchantAccount && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  事業者名
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                店舗名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                住所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                メールアドレス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                電話番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                承認ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                登録日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                更新日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
          {shops.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50">
                {!isMerchantAccount && !isShopAccount && (
                  <td className="px-6 py-4 whitespace-nowrap w-32">
                    <Checkbox
                      checked={selectedShops.has(shop.id)}
                      onChange={(checked) => onToggleShop(shop.id, checked)}
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap w-32">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={{
                        pathname: `/merchants/${merchantId || shop.merchantId}/shops/${shop.id}/edit`,
                        query: { returnTo: encodedReturnTo },
                      }}
                    >
                       <button
                        className="p-2 text-green-600 hover:text-green-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
                        title="編集"
                      >
                        <Image
                          src="/edit.svg"
                          alt="編集"
                          width={24}
                          height={24}
                          className="w-6 h-6 flex-shrink-0"
                        />
                      </button>
                    </Link>
                    <Link
                      href={{
                        pathname: '/coupons',
                        query: {
                          shopId: shop.id,
                          ...(merchantId || shop.merchantId ? { merchantId: merchantId || shop.merchantId } : {}),
                          returnTo: encodedReturnTo,
                        },
                      }}
                      prefetch={false}
                    >
                      <button 
                        className="p-2 text-orange-600 hover:text-orange-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[48px] min-h-[48px]"
                        title="クーポン管理"
                      >
                        <Image 
                          src="/coupon.svg" 
                          alt="クーポン" 
                          width={48}
                          height={48}
                          className="w-10 h-10"
                        />
                      </button>
                    </Link>
                  </div>
                </td>
                {!merchantId && !isMerchantAccount && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="text-sm font-medium text-gray-900">
                      {shop.merchant?.name || '-'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                  <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                  {shop.nameKana && (
                    <div className="text-sm text-gray-500">{shop.nameKana}</div>
                  )}
                </td>
                <td className="px-6 py-4 min-w-[250px]">
                  <div className="text-sm text-gray-900">
                    {shop.postalCode ? `〒${shop.postalCode}` : '-'}
                  </div>
                  <div className="text-sm text-gray-900 mt-1">
                    {shop.address || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                  <div className="text-sm text-gray-900">{('accountEmail' in shop && shop.accountEmail) || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{shop.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                  {isMerchantAccount ? (
                    <div className={`text-sm font-medium rounded-lg px-3 py-2 ${getStatusColor(shop.status)}`}>
                      {statusLabels[shop.status] || shop.status}
                    </div>
                  ) : (
                    <select
                      value={shop.status}
                      onChange={(e) => onStatusChange(shop.id, e.target.value)}
                      className={`text-sm font-medium rounded-lg px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 w-full min-w-[180px] ${getStatusColor(shop.status)}`}
                    >
                      {statusOptions?.map((option) => (
                        <option key={option.value} value={option.value} className={getStatusColor(option.value)}>
                          {option.label}
                        </option>
                      )) || (
                        <option value={shop.status} className={getStatusColor(shop.status)}>
                          {statusLabels[shop.status] || shop.status}
                        </option>
                      )}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                  <div className="text-sm text-gray-900">
                    {new Date(shop.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                  <div className="text-sm text-gray-900">
                    {new Date(shop.updatedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
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

      {!isLoading && shops.length === 0 && (
        <div className="text-center py-12">
          <Image 
            src="/storefront-icon.svg" 
            alt="店舗" 
            width={48} 
            height={48}
            className="mx-auto text-gray-400 mb-4"
          />
          <h3 className="text-lg font-medium text-gray-900 mb-2">店舗が見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

export default React.memo(ShopTable);

