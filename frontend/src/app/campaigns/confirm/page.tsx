'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import CampaignOverlapModal from '@/components/molecules/campaign-overlap-modal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';
import type { Campaign, CampaignCreateResponse } from '@hv-development/schemas';

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
  const [acknowledgedOverlapIds, setAcknowledgedOverlapIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('campaignConfirmData');
      if (!stored) {
        router.replace('/campaigns/new');
        return;
      }
      setFormData(JSON.parse(stored) as CampaignFormData);
      const storedIds = sessionStorage.getItem('campaignAcknowledgedOverlapIds');
      if (storedIds) {
        try {
          const parsed = JSON.parse(storedIds) as unknown;
          setAcknowledgedOverlapIds(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
        } catch {
          setAcknowledgedOverlapIds([]);
        }
      }
    } catch (error) {
      console.error('データ復元失敗:', error);
      router.replace('/campaigns/new');
    }
  }, [router]);

  const handleModify = useCallback(() => {
    router.back();
  }, [router]);

  const submitCampaign = useCallback(async (acknowledgedIds: string[]) => {
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
        acknowledgedOverlapIds: acknowledgedIds,
      };

      const result = (await apiClient.createCampaign(payload)) as CampaignCreateResponse;
      sessionStorage.removeItem('campaignConfirmData');
      sessionStorage.removeItem('campaignAcknowledgedOverlapIds');
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
    submitCampaign(acknowledgedOverlapIds);
  }, [submitCampaign, acknowledgedOverlapIds]);

  const handleConfirmOverlap = useCallback(() => {
    setOverlapConfirmOpen(false);
    const merged = Array.from(new Set([
      ...acknowledgedOverlapIds,
      ...overlappingCampaigns.map((c) => c.id),
    ]));
    setAcknowledgedOverlapIds(merged);
    submitCampaign(merged);
  }, [acknowledgedOverlapIds, overlappingCampaigns, submitCampaign]);

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

      <CampaignOverlapModal
        open={overlapConfirmOpen}
        campaigns={overlappingCampaigns}
        message={'以下のキャンペーンと期間が重複しています。内容をご確認の上ご登録を\nお願いします。'}
        confirmLabel={isSubmitting ? '登録中…' : '登録する'}
        disabled={isSubmitting}
        onCancel={() => setOverlapConfirmOpen(false)}
        onConfirm={handleConfirmOverlap}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
