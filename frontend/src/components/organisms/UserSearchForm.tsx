'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export interface UserSearchFormData {
  nickname: string;
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
}

interface UserSearchFormProps {
  searchForm: UserSearchFormData;
  isSearchExpanded: boolean;
  isOperatorRole: boolean;
  onInputChange: (field: keyof UserSearchFormData, value: string) => void;
  onRankChange: (rank: number, checked: boolean) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

export default function UserSearchForm({
  searchForm,
  isSearchExpanded,
  isOperatorRole,
  onInputChange,
  onRankChange,
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

            {/* 都道府県 */}
            {!isOperatorRole && (
              <div>
                <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-2">
                  都道府県
                </label>
                <select
                  id="prefecture"
                  value={searchForm.prefecture}
                  onChange={(e) => onInputChange('prefecture', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">都道府県を選択してください</option>
                  {prefectures.map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 市区町村 */}
            {!isOperatorRole && (
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  市区町村
                </label>
                <input
                  type="text"
                  id="city"
                  placeholder="市区町村を入力"
                  value={searchForm.city}
                  onChange={(e) => onInputChange('city', e.target.value)}
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

          {/* ランクと性別を横並びに配置 */}
          <div className="md:col-span-2 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ランク（複数選択可） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ランク（複数選択可）
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchForm.ranks.includes(1)}
                      onChange={(e) => onRankChange(1, e.target.checked)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">ブロンズ</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchForm.ranks.includes(2)}
                      onChange={(e) => onRankChange(2, e.target.checked)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">シルバー</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchForm.ranks.includes(3)}
                      onChange={(e) => onRankChange(3, e.target.checked)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">ゴールド</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchForm.ranks.includes(4)}
                      onChange={(e) => onRankChange(4, e.target.checked)}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">ダイヤモンド</span>
                  </label>
                </div>
              </div>

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
                        value="1"
                        checked={searchForm.gender === '1'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">男性</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="2"
                        checked={searchForm.gender === '2'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">女性</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="3"
                        checked={searchForm.gender === '3'}
                        onChange={(e) => onInputChange('gender', e.target.value)}
                        className="mr-2 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">未回答</span>
                    </label>
                  </div>
                </div>
              )}
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

