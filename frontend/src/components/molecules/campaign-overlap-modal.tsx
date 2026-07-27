'use client';

import Button from '@/components/atoms/Button';
import type { Campaign } from '@hv-development/schemas';

type OverlapBadge = { label: string; className: string };

function computeOverlapBadge(campaign: Campaign): OverlapBadge {
  const now = Date.now();
  const startAt = new Date(campaign.startAt).getTime();
  const endAt = campaign.endAt ? new Date(campaign.endAt).getTime() : null;
  if (campaign.status !== 'active' || (endAt !== null && now > endAt)) {
    return { label: '実施終了', className: 'bg-gray-200 text-gray-600' };
  }
  if (now < startAt) {
    return { label: '実施予定', className: 'bg-[#fcf7e9] text-[#866e43]' };
  }
  return { label: '実施中', className: 'bg-[#e2fbe8] text-[#33803f]' };
}

function formatOverlapPeriod(campaign: Campaign): string {
  const start = new Date(campaign.startAt);
  const startStr = `${start.getFullYear()}/${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
  if (!campaign.endAt) return `${startStr}〜（無期限）`;
  const end = new Date(campaign.endAt);
  const endStr = `${end.getFullYear()}/${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`;
  return `${startStr}〜${endStr}`;
}

interface CampaignOverlapModalProps {
  open: boolean;
  campaigns: Campaign[];
  message: string;
  confirmLabel: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CampaignOverlapModal({
  open,
  campaigns,
  message,
  confirmLabel,
  disabled = false,
  onCancel,
  onConfirm,
}: CampaignOverlapModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#866e43]">warning</span>
            <h3 className="text-lg font-semibold text-gray-900">
              期間が重複するキャンペーンがあります
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            aria-label="閉じる"
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 本文 */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>

          {/* 重複キャンペーン一覧 */}
          <div className="space-y-2">
            {campaigns.map((c) => {
              const badge = computeOverlapBadge(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatOverlapPeriod(c)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 注記バナー */}
          <div className="bg-[#fcf7e9] border border-[#e6d38a] rounded-md px-3 py-2 text-xs text-[#866e43] leading-relaxed">
            ※ 同期間に複数キャンペーンを稼働させると、ユーザーが他のコードを入力できます。
            <br />
            （1年間はキャンペーンの重複適用はブロックされます）
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={disabled}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
