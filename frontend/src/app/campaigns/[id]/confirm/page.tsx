'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/contexts/auth-context';
import { apiClient } from '@/lib/api';
import type { CampaignStatus, CampaignUpdateResponse } from '@hv-development/schemas';

export const dynamic = 'force-dynamic';

interface CampaignEditFormData {
  name: string;
  description: string;
  code: string;
  freeDays: string;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
  isStarted: boolean;
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

function formatStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case 'active': return '有効';
    case 'inactive': return '無効';
    case 'archived': return 'アーカイブ';
    default: return status;
  }
}

export default function EditConfirmCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showError } = useToast();

  const [formData, setFormData] = useState<CampaignEditFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`campaignEditConfirmData_${campaignId}`);
      if (!stored) {
        router.replace(`/campaigns/${campaignId}/edit`);
        return;
      }
      setFormData(JSON.parse(stored) as CampaignEditFormData);
    } catch (error) {
      console.error('データ復元失敗:', error);
      router.replace(`/campaigns/${campaignId}/edit`);
    }
  }, [campaignId, router]);

  const handleModify = useCallback(() => {
    router.back();
  }, [router]);

  const handleUpdate = useCallback(async () => {
    if (!formData) return;
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        endAt: formData.endAt
          ? new Date(`${formData.endAt}T00:00:00+09:00`).toISOString()
          : null,
        status: formData.status,
      };
      if (!formData.isStarted) {
        payload.freeDays = Number(formData.freeDays);
        payload.startAt = new Date(`${formData.startAt}T00:00:00+09:00`).toISOString();
        payload.code = formData.code;
      }

      await apiClient.updateCampaign(campaignId, payload) as CampaignUpdateResponse;
      sessionStorage.removeItem(`campaignEditConfirmData_${campaignId}`);
      router.push(`/campaigns?toast=${encodeURIComponent('キャンペーンを更新しました')}`);
    } catch (error) {
      const err = error as { response?: { data?: { error?: { code?: string; message?: string } } }; message?: string };
      const code = err.response?.data?.error?.code;
      const message = err.response?.data?.error?.message ?? err.message ?? '更新に失敗しました';
      if (code === 'CAMPAIGN_LOCKED_FIELD') {
        showError('開始後に変更できない項目が含まれています');
      } else {
        showError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, campaignId, router, showError]);

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
              <h1 className="text-2xl font-bold text-gray-900">キャンペーン更新内容確認</h1>
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

        {/* カード 1: 編集項目 */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {formData.isStarted ? '編集項目' : 'キャンペーン内容'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーン名</label>
            <p className="text-gray-900 bg-gray-50 p-2 rounded">{formData.name}</p>
          </div>

          {/* 開始前のみ: キャンペーンコード */}
          {!formData.isStarted && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーンコード</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded font-mono">{formData.code}</p>
            </div>
          )}

          {/* 開始前のみ: 無料期間 */}
          {!formData.isStarted && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">無料期間</label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">{formData.freeDays}日</p>
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開催ステータス</label>
            <p className="text-gray-900 bg-gray-50 p-2 rounded">{formatStatusLabel(formData.status)}</p>
          </div>
        </section>

        {/* カード 2: キャンペーン情報（開始後のみ・Figma に合わせて下に配置） */}
        {formData.isStarted && (
          <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">キャンペーン情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">キャンペーンコード</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded font-mono">{formData.code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">無料期間</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{formData.freeDays}日</p>
              </div>
            </div>
          </section>
        )}

        {/* アクションボタン */}
        <div className="flex justify-center gap-4 pt-6">
          <Button type="button" variant="outline" onClick={handleModify} disabled={isSubmitting}>
            更新内容を修正する
          </Button>
          <Button type="button" variant="primary" onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? '更新中…' : '更新する'}
          </Button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
