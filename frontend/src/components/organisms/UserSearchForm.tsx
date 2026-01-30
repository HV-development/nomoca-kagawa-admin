'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

export interface UserSearchFormData {
  nickname: string;
  email: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  birthDate: string;
  gender: string;
  saitamaAppId: string;
  ranks: number[];
  registeredDateStart: string;
  registeredDateEnd: string;
  accountStatus: string;
}

interface UserSearchFormProps {
  searchForm: UserSearchFormData;
  isSearchExpanded: boolean;
  isOperatorRole: boolean;
  onInputChange: (field: keyof UserSearchFormData, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

export default function UserSearchForm({
  searchForm,
  isSearchExpanded,
  isOperatorRole,
  onInputChange,
  onSearch,
  onClear,
  onToggleExpand,
}: UserSearchFormProps) {
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
            {/* ニックネーム */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                ニックネーム
              </label>
              <input
                type="text"
                id="nickname"
                placeholder="ニックネームを入力"
                value={searchForm.nickname}
                onChange={(e) => onInputChange('nickname', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* メールアドレス */}
            {!isOperatorRole && (
              <div>
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
            )}

            {/* 郵便番号 */}
            {!isOperatorRole && (
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  郵便番号
                </label>
                <input
                  type="text"
                  id="postalCode"
                  placeholder="郵便番号を入力"
                  value={searchForm.postalCode}
                  onChange={(e) => onInputChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            )}

            {/* 住所 */}
            {!isOperatorRole && (
              <div>
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

            {/* 生年月日 */}
            {!isOperatorRole && (
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                  生年月日
                </label>
                <input
                  type="date"
                  id="birthDate"
                  value={searchForm.birthDate}
                  onChange={(e) => onInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            )}

            {/* 登録日範囲指定 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                登録日（範囲指定）
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="registeredDateStart" className="block text-xs text-gray-500 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    id="registeredDateStart"
                    value={searchForm.registeredDateStart}
                    onChange={(e) => onInputChange('registeredDateStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="registeredDateEnd" className="block text-xs text-gray-500 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    id="registeredDateEnd"
                    value={searchForm.registeredDateEnd}
                    onChange={(e) => onInputChange('registeredDateEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 性別とステータスを横並びに配置 */}
          <div className="md:col-span-2 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 性別 */}
              {!isOperatorRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性別
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value=""
                        checked={searchForm.gender === ''}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">すべて</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={searchForm.gender === 'male'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">男性</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={searchForm.gender === 'female'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">女性</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={searchForm.gender === 'other'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">未回答</span>
                    </label>
                  </div>
                </div>
              )}

              {/* アカウントステータス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountStatus"
                      value=""
                      checked={searchForm.accountStatus === ''}
                      onChange={(e) => onInputChange('accountStatus', e.target.value)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">すべて</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountStatus"
                      value="active"
                      checked={searchForm.accountStatus === 'active'}
                      onChange={(e) => onInputChange('accountStatus', e.target.value)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">契約中</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountStatus"
                      value="suspended"
                      checked={searchForm.accountStatus === 'suspended'}
                      onChange={(e) => onInputChange('accountStatus', e.target.value)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">退会済み</span>
                  </label>
                </div>
              </div>
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
