'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';
import type { Campaign, CampaignCreateResponse } from '@hv-development/schemas';

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

export const dynamic = 'force-dynamic';

interface CampaignFormData {
  name: string;
  description: string;
  code: string;
  freeDays: string;
  startAt: string;
  endAt: string;
}

function formatDate(dateInput: string): string {
  if (!dateInput) return '';
  return dateInput.replace(/-/g, '/');
}

function formatPeriod(startAt: string, endAt: string): string {
  const start = formatDate(startAt);
  if (!endAt) return `${start} 〜 （無期限）`;
  return `${start} 〜 ${formatDate(endAt)}`;
}

export default function ConfirmCampaignPage() {
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showError } = useToast();

  const [formData, setFormData] = useState<CampaignFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [overlapConfirmOpen, setOverlapConfirmOpen] = useState(false);
  const [overlappingCampaigns, setOverlappingCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('campaignConfirmData');
      if (!stored) {
        router.replace('/campaigns/new');
        return;
      }
      setFormData(JSON.parse(stored) as CampaignFormData);
    } catch (error) {
      console.error('データ復元失敗:', error);
      router.replace('/campaigns/new');
    }
  }, [router]);

  const handleModify = useCallback(() => {
    router.back();
  }, [router]);

  const submitCampaign = useCallback(async (acknowledgeOverlap: boolean) => {
    if (!formData) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        code: formData.code,
        freeDays: Number(formData.freeDays),
        startAt: new Date(`${formData.startAt}T00:00:00+09:00`).toISOString(),
        endAt: formData.endAt
          ? new Date(`${formData.endAt}T00:00:00+09:00`).toISOString()
          : null,
        acknowledgeOverlap,
      };

      const result = (await apiClient.createCampaign(payload)) as CampaignCreateResponse;
      sessionStorage.removeItem('campaignConfirmData');
      const message = result.warn === 'OVERLAP'
        ? 'キャンペーンを登録しました（期間重複あり）'
        : 'キャンペーンを登録しました';
      router.push(`/campaigns?toast=${encodeURIComponent(message)}`);
    } catch (error) {
      const err = error as {
        response?: {
          data?: {
            error?: {
              code?: string;
              message?: string;
              details?: { overlappingCampaigns?: Campaign[] };
            };
          };
        };
        message?: string;
      };
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message ?? err.message ?? '登録に失敗しました';

      if (code === 'CAMPAIGN_PERIOD_OVERLAP') {
        setOverlappingCampaigns(err.response?.data?.error?.details?.overlappingCampaigns ?? []);
        setOverlapConfirmOpen(true);
        return;
      }
      showError(message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [formData, router, showError]);

  const handleRegister = useCallback(() => {
    submitCampaign(false);
  }, [submitCampaign]);

  const handleConfirmOverlap = useCallback(() => {
    setOverlapConfirmOpen(false);
    submitCampaign(true);
  }, [submitCampaign]);

  if (!formData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ページタイトル */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">キャンペーン登録内容確認</h1>
              <p className="text-gray-600">入力内容を確認してください</p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
                <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 警告バナー */}
        <div className="bg-[#fcf7e9] border border-[#e6d38a] rounded-lg px-4 py-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-[#866e43] text-lg mt-0.5">warning</span>
          <p className="text-sm text-[#866e43]">
            キャンペーン開始後は、キャンペーンコード・無料期間・開始日時の変更ができません。
          </p>
        </div>

        {/* 確認内容 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーン名</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{formData.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーンコード</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded font-mono">{formData.code}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">無料期間</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{formData.freeDays}日</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーン実施期間</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {formatPeriod(formData.startAt, formData.endAt)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">管理用メモ</label>
              <p className={`bg-gray-50 p-2 rounded whitespace-pre-wrap ${
                formData.description ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {formData.description || '（未入力）'}
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center space-x-4 pt-6 mt-6 border-t border-gray-200">
            <Button variant="outline" onClick={handleModify} disabled={isSubmitting}>
              登録内容を修正する
            </Button>
            <Button variant="primary" onClick={handleRegister} disabled={isSubmitting}>
              {isSubmitting ? '登録中…' : '登録する'}
            </Button>
          </div>
        </div>
      </div>

      {/* 期間重複警告モーダル */}
      {overlapConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#866e43]">warning</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  期間が重複するキャンペーンがあります
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverlapConfirmOpen(false)}
                disabled={isSubmitting}
                aria-label="閉じる"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* 本文 */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                以下のキャンペーンと期間が重複しています。内容をご確認の上ご登録を
                <br />
                お願いします。
              </p>

              {/* 重複キャンペーン一覧 */}
              <div className="space-y-2">
                {overlappingCampaigns.map((c) => {
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
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <Button variant="outline" onClick={() => setOverlapConfirmOpen(false)} disabled={isSubmitting}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleConfirmOverlap} disabled={isSubmitting}>
                {isSubmitting ? '登録中…' : '登録する'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
