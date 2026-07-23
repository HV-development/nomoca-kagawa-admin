'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import IconButton from '@/components/atoms/IconButton';
import Checkbox from '@/components/atoms/Checkbox';
import type { Campaign } from '@hv-development/schemas';

interface CampaignTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  selectedCampaigns: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onToggleAll: (checked: boolean) => void;
  onToggleCampaign: (campaignId: string, checked: boolean) => void;
}

type BadgeVariant = 'ongoing' | 'scheduled' | 'ended';

function computeBadge(campaign: Campaign): { label: string; variant: BadgeVariant } {
  const now = Date.now();
  const startAt = new Date(campaign.startAt).getTime();
  const endAt = campaign.endAt ? new Date(campaign.endAt).getTime() : null;

  // status が active 以外 or 終了日を過ぎた → 実施終了
  if (campaign.status !== 'active' || (endAt !== null && now > endAt)) {
    return { label: '実施終了', variant: 'ended' };
  }
  // まだ開始していない → 実施予定
  if (now < startAt) {
    return { label: '実施予定', variant: 'scheduled' };
  }
  // それ以外 → 実施中
  return { label: '実施中', variant: 'ongoing' };
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  ongoing: 'bg-[#e2fbe8] text-[#33803f]',
  scheduled: 'bg-[#fcf7e9] text-[#866e43]',
  ended: 'bg-gray-200 text-gray-600',
};

function formatDateRange(startAt: string, endAt: string | null): string {
  const start = formatDate(startAt);
  if (!endAt) {
    return `${start}〜（無期限）`;
  }
  return `${start}〜${formatDate(endAt)}`;
}

const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const jstDateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatDate(iso: string): string {
  const parts = jstDateFormatter.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}

function formatDateTime(iso: string): string {
  const parts = jstDateTimeFormatter.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export default function CampaignTable({
  campaigns,
  isLoading,
  selectedCampaigns,
  isAllSelected,
  isIndeterminate,
  pagination,
  onToggleAll,
  onToggleCampaign,
}: CampaignTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
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
          キャンペーン一覧 ({pagination.total}件)
        </h3>
        <Link href="/campaigns/new">
          <Button variant="outline" className="bg-white text-green-600 border-green-600 hover:bg-green-50">
            <span className="mr-2">+</span>
            新規作成
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onToggleAll}
                />
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                キャンペーン名
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                キャンペーンコード
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                無料日数
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                期間
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日時
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                更新日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => {
              const badge = computeBadge(campaign);
              return (
                <tr key={campaign.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={selectedCampaigns.has(campaign.id)}
                      onChange={(checked) => onToggleCampaign(campaign.id, checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/campaigns/${campaign.id}/edit`}>
                      <IconButton color="green" title="編集">
                        <Image src="/edit.svg" alt="編集" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                      </IconButton>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                    {campaign.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {campaign.freeDays}日
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${BADGE_CLASSES[badge.variant]}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateRange(campaign.startAt, campaign.endAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateTime(campaign.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateTime(campaign.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {campaigns.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">キャンペーンが見つかりません</p>
        </div>
      )}
    </div>
  );
}
