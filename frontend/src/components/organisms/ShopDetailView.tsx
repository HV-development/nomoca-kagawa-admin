'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/atoms/Button';
import { statusOptions } from '@/lib/constants/shop';
import type { Shop } from '@hv-development/schemas';

interface ShopDetailViewProps {
  shop: Shop;
  merchantId?: string;
  encodedReturnTo: string;
  getStatusColor: (status: string) => string;
}

function ShopDetailView({
  shop,
  merchantId,
  encodedReturnTo,
  getStatusColor,
}: ShopDetailViewProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 space-y-6">
        {/* 基本情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">店舗名</td>
                <td className="py-3 px-4 text-gray-900">{shop.name}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">店舗名（カナ）</td>
                <td className="py-3 px-4 text-gray-900">{shop.nameKana}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">電話番号</td>
                <td className="py-3 px-4 text-gray-900">{shop.phone}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">事業者名</td>
                <td className="py-3 px-4 text-gray-900">{shop.merchant?.name || '-'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">ジャンル</td>
                <td className="py-3 px-4 text-gray-900">{shop.genre?.name || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 住所情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">住所情報</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">郵便番号</td>
                <td className="py-3 px-4 text-gray-900">{shop.postalCode ? `〒${shop.postalCode}` : '-'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">住所</td>
                <td className="py-3 px-4 text-gray-900">{shop.address || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 店舗詳細情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">店舗詳細</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">定休日</td>
                <td className="py-3 px-4 text-gray-900">{shop.holidays || '-'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">喫煙可否</td>
                <td className="py-3 px-4 text-gray-900">
                  {shop.smokingType === 'non_smoking' ? '禁煙' : 
                   shop.smokingType === 'smoking_allowed' ? '喫煙可' : 
                   shop.smokingType === 'separated' ? '分煙' : 
                   shop.smokingType === 'electronic_only' ? '電子のみ' : '-'}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">ホームページURL</td>
                <td className="py-3 px-4 text-gray-900">
                  {('homepageUrl' in shop && shop.homepageUrl) ? (
                    <a href={shop.homepageUrl as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{shop.homepageUrl as string}</a>
                  ) : '-'}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">クーポン利用時間</td>
                <td className="py-3 px-4 text-gray-900">
                  {('couponUsageStart' in shop && 'couponUsageEnd' in shop && shop.couponUsageStart && shop.couponUsageEnd) ? `${shop.couponUsageStart as string}〜${shop.couponUsageEnd as string}` : '-'}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">ステータス</td>
                <td className={`py-3 px-4 text-sm font-medium ${getStatusColor(shop.status)}`}>
                  {statusOptions.find(opt => opt.value === shop.status)?.label || shop.status}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* アカウント情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">メールアドレス</td>
                <td className="py-3 px-4 text-gray-900">{('accountEmail' in shop && shop.accountEmail) || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 決済情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">決済情報</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">マイデジ決済</td>
                <td className="py-3 px-4 text-gray-900">{shop.paymentMydigi ? '利用可能' : '利用不可'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">現金決済</td>
                <td className="py-3 px-4 text-gray-900">{shop.paymentCash ? '利用可能' : '利用不可'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* フッターボタン */}
        <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
          <Link href="/coupons">
            <Button variant="outline" className="cursor-pointer border-green-600 text-green-600 hover:bg-green-50">
              クーポン一覧
            </Button>
          </Link>
          <Link
            href={{
              pathname: merchantId ? `/merchants/${merchantId}/shops/${shop.id}/edit` : `/shops/${shop.id}/edit`,
              query: { returnTo: encodedReturnTo },
            }}
          >
            <Button variant="primary" className="cursor-pointer bg-green-600 hover:bg-green-700 text-white">
              編集
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ShopDetailView);

