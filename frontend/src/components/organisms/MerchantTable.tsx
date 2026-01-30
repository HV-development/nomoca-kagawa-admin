'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import IconButton from '@/components/atoms/IconButton';
import Checkbox from '@/components/atoms/Checkbox';

// Merchant型定義
interface Merchant {
  id: string;
  name: string;
  nameKana: string;
  representativeNameLast: string;
  representativeNameFirst: string;
  representativeNameLastKana: string;
  representativeNameFirstKana: string;
  representativePhone: string;
  email: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string | null;
  status: string;
  createdAt: string;
  account?: {
    email: string;
    status: string;
    displayName: string | null;
    lastLoginAt: string | null;
    passwordHash?: string | null;
  };
}

interface MerchantTableProps {
  merchants: Merchant[];
  isLoading: boolean;
  isOperatorRole: boolean;
  isMerchantAccount: boolean;
  selectedMerchants: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  isDownloadingCSV: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onToggleAll: (checked: boolean) => void;
  onToggleMerchant: (merchantId: string, checked: boolean) => void;
  onDownloadAllCSV: () => void;
  onResendRegistration: (merchantId: string) => void;
}

export default function MerchantTable({
  merchants,
  isLoading,
  isOperatorRole,
  isMerchantAccount,
  selectedMerchants,
  isAllSelected,
  isIndeterminate,
  isDownloadingCSV,
  pagination,
  onToggleAll,
  onToggleMerchant,
  onDownloadAllCSV,
  onResendRegistration,
}: MerchantTableProps) {
  const getAccountStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '発行済み';
      case 'inactive': return '未発行';
      case 'pending': return '承認待ち';
      case 'suspended': return '停止中';
      default: return status;
    }
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-yellow-600';
      case 'pending': return 'text-orange-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  const getMerchantStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '契約中';
      case 'inactive': return '未契約';
      case 'terminated': return '解約済み';
      default: return status;
    }
  };

  const getMerchantStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-yellow-600';
      case 'terminated': return 'text-gray-600';
      default: return 'text-gray-900';
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
          事業者一覧 ({!isMerchantAccount ? pagination.total : merchants.length}件)
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onDownloadAllCSV}
            disabled={isDownloadingCSV || merchants.length === 0}
            className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link href="/merchants/new">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onToggleAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 whitespace-nowrap">
                <span className="text-xs whitespace-nowrap">アクション</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                事業者名
              </th>
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  代表者名
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  電話番号
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  メールアドレス
                </th>
              )}
              {!isOperatorRole && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                  住所
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                アカウント発行
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                契約ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                登録日
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
          {merchants.map((merchant) => (
              <tr key={merchant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedMerchants.has(merchant.id)}
                    onChange={(checked) => onToggleMerchant(merchant.id, checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-48">
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/merchants/${merchant.id}/edit`}>
                      <IconButton color="green" title="編集">
                        <Image 
                          src="/edit.svg" 
                          alt="編集" 
                          width={24}
                          height={24}
                          className="w-6 h-6 flex-shrink-0"
                        />
                      </IconButton>
                    </Link>
                    <Link href={`/merchants/${merchant.id}/shops`}>
                      <IconButton color="blue" title="店舗一覧">
                        <Image 
                          src="/store-list.svg" 
                          alt="店舗一覧" 
                          width={24}
                          height={24}
                          className="w-6 h-6 flex-shrink-0"
                        />
                      </IconButton>
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                  <div className="text-sm font-medium text-gray-900">{merchant.name}</div>
                  <div className="text-sm text-gray-500">{merchant.nameKana}</div>
                </td>
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                    <div className="text-sm font-medium text-gray-900">{merchant.representativeNameLast} {merchant.representativeNameFirst}</div>
                    <div className="text-sm text-gray-500">{merchant.representativeNameLastKana} {merchant.representativeNameFirstKana}</div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                    <div className="text-sm text-gray-900">{merchant.representativePhone}</div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="text-sm text-gray-900">{merchant.email}</div>
                  </td>
                )}
                {!isOperatorRole && (
                  <td className="px-6 py-4 whitespace-nowrap min-w-[250px]">
                    <div className="text-sm text-gray-900">
                      〒{merchant.postalCode}<br />
                      {merchant.prefecture}{merchant.city}{merchant.address1}{merchant.address2}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <div className={`text-sm font-medium ${getAccountStatusColor(merchant.account?.status || 'inactive')}`}>
                      {getAccountStatusLabel(merchant.account?.status || 'inactive')}
                    </div>
                    {(merchant.account?.status === 'inactive' || merchant.account?.status === 'pending') && (
                      <IconButton
                        color="orange"
                        onClick={() => onResendRegistration(merchant.id)}
                        title="アカウント発行メール再送"
                      >
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </IconButton>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[180px]">
                  <div className={`text-sm font-medium ${getMerchantStatusColor(merchant.status || 'active')}`}>
                    {getMerchantStatusLabel(merchant.status || 'active')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                  <div className="text-sm text-gray-900">
                    {new Date(merchant.createdAt).toLocaleDateString('ja-JP', {
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

      {!isLoading && merchants.length === 0 && (
        <div className="text-center py-12">
          <Image 
            src="/storefront-icon.svg" 
            alt="店舗" 
            width={48} 
            height={48}
            className="mx-auto text-gray-400 mb-4"
          />
          <h3 className="text-lg font-medium text-gray-900 mb-2">事業者が見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

