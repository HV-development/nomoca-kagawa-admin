'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Checkbox from '@/components/atoms/Checkbox';

export interface CampaignSearchFormData {
  campaignName: string;
  campaignCode: string;
  startDateFrom: string;
  endDateTo: string;
  freeDays: string;
}

export type CampaignStatusFilter = 'ongoing' | 'scheduled' | 'ended';

interface CampaignSearchFormProps {
  searchForm: CampaignSearchFormData;
  statusFilters: Set<CampaignStatusFilter>;
  isSearchExpanded: boolean;
  onInputChange: (field: keyof CampaignSearchFormData, value: string) => void;
  onToggleStatus: (status: CampaignStatusFilter) => void;
  onSearch: () => void;
  onClear: () => void;
  onToggleExpand: () => void;
}

const STATUS_OPTIONS: { value: CampaignStatusFilter; label: string }[] = [
  { value: 'ongoing', label: '実施中' },
  { value: 'scheduled', label: '実施予定' },
  { value: 'ended', label: '実施終了' },
];

export default function CampaignSearchForm({
  searchForm,
  statusFilters,
  isSearchExpanded,
  onInputChange,
  onToggleStatus,
  onSearch,
  onClear,
  onToggleExpand,
}: CampaignSearchFormProps) {
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
        <div className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* キャンペーン名 */}
            <div>
              <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-2">
                キャンペーン名
              </label>
              <input
                type="text"
                id="campaignName"
                placeholder="キャンペーン名を入力"
                value={searchForm.campaignName}
                onChange={(e) => onInputChange('campaignName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* キャンペーンコード */}
            <div>
              <label htmlFor="campaignCode" className="block text-sm font-medium text-gray-700 mb-2">
                キャンペーンコード
              </label>
              <input
                type="text"
                id="campaignCode"
                placeholder="キャンペーンコードを入力"
                value={searchForm.campaignCode}
                onChange={(e) => onInputChange('campaignCode', e.target.value.toLowerCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 実施期間: 開始日〜終了日 の日付ペア（2列を1つのブロックとして扱う） */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                実施期間（範囲指定）
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">開始日</span>
                  <input
                    type="date"
                    value={searchForm.startDateFrom}
                    onChange={(e) => onInputChange('startDateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">終了日</span>
                  <input
                    type="date"
                    value={searchForm.endDateTo}
                    onChange={(e) => onInputChange('endDateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* 無料日数（ステータスの左横に配置するため、Row 3 の col 1 に強制配置） */}
            <div className="lg:col-start-1">
              <label htmlFor="freeDays" className="block text-sm font-medium text-gray-700 mb-2">
                無料日数
              </label>
              <input
                type="number"
                id="freeDays"
                min={1}
                max={180}
                placeholder="無料日数を入力"
                value={searchForm.freeDays}
                onChange={(e) => onInputChange('freeDays', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* ステータス（複数チェックボックス） */}
            <div className="lg:col-span-2">
              <span className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </span>
              <div className="flex flex-wrap gap-6 pt-2">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="inline-flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={statusFilters.has(opt.value)}
                      onChange={() => onToggleStatus(opt.value)}
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
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
