'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

export interface CouponSearchFormData {
  merchantName: string;
  shopName: string;
  couponName: string;
}

export type ApprovalStatus = 'all' | 'pending' | 'approved' | 'suspended';
export type PublicStatus = 'all' | 'public' | 'private';

interface CouponSearchFormProps {
  searchForm: CouponSearchFormData;
  approvalStatus: ApprovalStatus;
  publicStatus: PublicStatus;
  isSearchExpanded: boolean;
  onInputChange: (field: keyof CouponSearchFormData, value: string) => void;
  onApprovalStatusChange: (value: ApprovalStatus) => void;
  onPublicStatusChange: (value: PublicStatus) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

export default function CouponSearchForm({
  searchForm,
  approvalStatus,
  publicStatus,
  isSearchExpanded,
  onInputChange,
  onApprovalStatusChange,
  onPublicStatusChange,
  onSearch,
  onClear,
  onToggleExpand,
}: CouponSearchFormProps) {
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
          <Icon name={isSearchExpanded ? 'chevronUp' : 'chevronDown'} size="sm" />
        </Button>
      </div>

      {isSearchExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 事業者名 */}
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

            {/* 店舗名 */}
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-2">
                店舗名
              </label>
              <input
                type="text"
                id="shopName"
                placeholder="店舗名を入力"
                value={searchForm.shopName}
                onChange={(e) => onInputChange('shopName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* クーポン名 */}
            <div>
              <label htmlFor="couponName" className="block text-sm font-medium text-gray-700 mb-2">
                クーポン名
              </label>
              <input
                type="text"
                id="couponName"
                placeholder="クーポン名を入力"
                value={searchForm.couponName}
                onChange={(e) => onInputChange('couponName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 承認ステータス */}
            <div>
              <label htmlFor="approvalStatus" className="block text-sm font-medium text-gray-700 mb-2">
                承認ステータス
              </label>
              <select
                id="approvalStatus"
                value={approvalStatus}
                onChange={(e) => onApprovalStatusChange(e.target.value as ApprovalStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">すべて</option>
                <option value="pending">申請中</option>
                <option value="approved">承認済み</option>
                <option value="suspended">停止中</option>
              </select>
            </div>

            {/* 公開ステータス */}
            <div>
              <label htmlFor="publicStatus" className="block text-sm font-medium text-gray-700 mb-2">
                公開ステータス
              </label>
              <select
                id="publicStatus"
                value={publicStatus}
                onChange={(e) => onPublicStatusChange(e.target.value as PublicStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">すべて</option>
                <option value="public">公開中</option>
                <option value="private">非公開</option>
              </select>
            </div>
          </div>

          {/* 検索・クリアボタン */}
          <div className="flex justify-end gap-2 mt-6">
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
