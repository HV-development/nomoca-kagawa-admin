'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { type AdminSearchForm as AdminSearchFormData } from '@hv-development/schemas';

interface AdminSearchFormProps {
  searchForm: AdminSearchFormData;
  isSearchExpanded: boolean;
  onInputChange: (field: keyof AdminSearchFormData, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

export default function AdminSearchForm({
  searchForm,
  isSearchExpanded,
  onInputChange,
  onSearch,
  onClear,
  onToggleExpand,
}: AdminSearchFormProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 氏名 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            氏名
          </label>
          <input
            type="text"
            id="name"
            placeholder="氏名を入力"
            value={searchForm.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            placeholder="メールアドレスを入力"
            value={searchForm.email}
            onChange={(e) => onInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* 権限 */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            権限
          </label>
          <select
            id="role"
            value={searchForm.role}
            onChange={(e) => onInputChange('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">すべて</option>
            <option value="sysadmin">管理者</option>
            <option value="operator">一般</option>
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

