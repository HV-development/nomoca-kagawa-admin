'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Checkbox from '@/components/atoms/Checkbox';
import { prefectures } from '@/lib/constants/merchant';

// アカウントステータスの定義
export const accountStatusOptions = [
  { value: 'inactive', label: '未発行' },
  { value: 'pending', label: '承認待ち' },
  { value: 'active', label: '発行済み' },
  { value: 'suspended', label: '停止中' },
] as const;

export interface MerchantSearchFormData {
  keyword: string;
  merchantName: string;
  merchantNameKana: string;
  representativeName: string;
  representativeNameKana: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  prefecture: string;
  accountStatuses: string[];
  contractStatus: string;
  createdAtFrom: string;
  createdAtTo: string;
}

export interface MerchantSearchErrors {
  createdAtFrom?: string;
  createdAtTo?: string;
}

interface MerchantSearchFormProps {
  searchForm: MerchantSearchFormData;
  searchErrors: MerchantSearchErrors;
  isSearchExpanded: boolean;
  isOperatorRole: boolean;
  onInputChange: (field: keyof MerchantSearchFormData, value: string) => void;
  onAccountStatusChange: (status: string, checked: boolean) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

export default function MerchantSearchForm({
  searchForm,
  searchErrors,
  isSearchExpanded,
  isOperatorRole,
  onInputChange,
  onAccountStatusChange,
  onSearch,
  onClear,
  onToggleExpand,
}: MerchantSearchFormProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="pb-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">検索条件</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="flex items-center focus:outline-none"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <span className={`text-gray-600 text-sm transition-transform duration-200 ${isSearchExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </Button>
      </div>
      
      {isSearchExpanded && (
      <div className="p-6 space-y-3">
        {/* フリーワード検索 */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
            フリーワード検索
          </label>
          <input
            type="text"
            id="keyword"
            placeholder="事業者名、代表者名、メールアドレス、電話番号などで検索"
            value={searchForm.keyword}
            onChange={(e) => onInputChange('keyword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* 事業者名と事業者名（カナ） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="merchantName" className="block text-sm font-medium text-gray-700 mb-2">
              事業者名
            </label>
            <input
              type="text"
              id="merchantName"
              placeholder="事業者名を入力"
              value={searchForm.merchantName}
              onChange={(e) => onInputChange('merchantName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="merchantNameKana" className="block text-sm font-medium text-gray-700 mb-2">
              事業者名（カナ）
            </label>
            <input
              type="text"
              id="merchantNameKana"
              placeholder="事業者名（カナ）を入力"
              value={searchForm.merchantNameKana}
              onChange={(e) => onInputChange('merchantNameKana', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* 代表者名と代表者名（カナ） */}
        {!isOperatorRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700 mb-2">
                代表者名
              </label>
              <input
                type="text"
                id="representativeName"
                placeholder="代表者名を入力"
                value={searchForm.representativeName}
                onChange={(e) => onInputChange('representativeName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="representativeNameKana" className="block text-sm font-medium text-gray-700 mb-2">
                代表者名（カナ）
              </label>
              <input
                type="text"
                id="representativeNameKana"
                placeholder="代表者名（カナ）を入力"
                value={searchForm.representativeNameKana}
                onChange={(e) => onInputChange('representativeNameKana', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}

        {/* 電話番号とメールアドレス */}
        {!isOperatorRole && (
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="text"
                id="phone"
                placeholder="電話番号を入力"
                value={searchForm.phone}
                onChange={(e) => onInputChange('phone', e.target.value)}
                className="w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="text"
                id="email"
                placeholder="メールアドレスを入力"
                value={searchForm.email}
                onChange={(e) => onInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}

        {/* 郵便番号、都道府県、住所 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
              郵便番号
            </label>
            <input
              type="text"
              id="postalCode"
              placeholder="0000000"
              value={searchForm.postalCode}
              onChange={(e) => onInputChange('postalCode', e.target.value)}
              className="w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-2">
              都道府県
            </label>
            <select
              id="prefecture"
              value={searchForm.prefecture}
              onChange={(e) => onInputChange('prefecture', e.target.value)}
              className="w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">すべて</option>
              {prefectures.map((pref) => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
          </div>
          {!isOperatorRole && (
            <div className="flex-1">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                住所
              </label>
              <input
                type="text"
                id="address"
                placeholder="住所を入力"
                value={searchForm.address}
                onChange={(e) => onInputChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}
        </div>

        {/* アカウントステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アカウントステータス
          </label>
          <div className="flex flex-wrap gap-4">
            {accountStatusOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={searchForm.accountStatuses.includes(option.value)}
                  onChange={(checked) => onAccountStatusChange(option.value, checked)}
                  size="sm"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 契約ステータス、登録日 */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <label htmlFor="contractStatus" className="block text-sm font-medium text-gray-700 mb-2">
              契約ステータス
            </label>
            <select
              id="contractStatus"
              value={searchForm.contractStatus}
              onChange={(e) => onInputChange('contractStatus', e.target.value)}
              className="w-[180px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">すべて</option>
              <option value="active">契約中</option>
              <option value="inactive">未契約</option>
              <option value="terminated">解約済み</option>
            </select>
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="createdAtFrom" className="block text-sm font-medium text-gray-700 mb-2">
              登録日（開始）
            </label>
            <input
              type="date"
              id="createdAtFrom"
              value={searchForm.createdAtFrom}
              onChange={(e) => onInputChange('createdAtFrom', e.target.value)}
              className="w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {searchErrors.createdAtFrom && (
              <p className="text-red-600 text-sm mt-1">{searchErrors.createdAtFrom}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="createdAtTo" className="block text-sm font-medium text-gray-700 mb-2">
              登録日（終了）
            </label>
            <input
              type="date"
              id="createdAtTo"
              value={searchForm.createdAtTo}
              onChange={(e) => onInputChange('createdAtTo', e.target.value)}
              className="w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            {searchErrors.createdAtTo && (
              <p className="text-red-600 text-sm mt-1">{searchErrors.createdAtTo}</p>
            )}
          </div>
        </div>

        {/* 検索・クリアボタン */}
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" onClick={onClear}>
            クリア
          </Button>
          <Button variant="primary" onClick={onSearch}>
            検索
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

