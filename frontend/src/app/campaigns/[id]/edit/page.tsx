'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import type {
  CampaignChangeHistoryWithAdmin,
  CampaignDetailResponse,
  CampaignStatus,
} from '@hv-development/schemas';

export const dynamic = 'force-dynamic';

interface CampaignEditFormData {
  name: string;
  description: string;
  code: string;
  freeDays: string;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
}

type CampaignFormErrors = Partial<Record<keyof CampaignEditFormData, string>>;

const FREE_DAYS_PRESETS = [7, 14, 30, 60, 90, 180];

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function formatChangeType(t: string): string {
  switch (t) {
    case 'created': return '作成';
    case 'name_changed': return 'キャンペーン名の変更';
    case 'description_changed': return '説明の変更';
    case 'code_changed': return 'キャンペーンコードの変更';
    case 'free_days_changed': return '無料期間の変更';
    case 'start_date_changed': return '開始日の変更';
    case 'end_date_changed': return '終了日の変更';
    case 'status_changed': return 'ステータス変更';
    case 'force_updated': return '強制変更';
    default: return t;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatFieldLabel(fieldName: string | null): string {
  switch (fieldName) {
    case 'name': return 'キャンペーン名';
    case 'description': return '管理用メモ';
    case 'code': return 'キャンペーンコード';
    case 'free_days': return '無料期間';
    case 'start_at': return 'キャンペーン実施開始日';
    case 'end_at': return 'キャンペーン実施終了日';
    case 'status': return '開催ステータス';
    default: return fieldName ?? '';
  }
}

function formatStatusJa(value: string): string {
  switch (value) {
    case 'active': return '有効';
    case 'inactive': return '無効';
    case 'archived': return 'アーカイブ';
    default: return value;
  }
}

function displayFieldValue(fieldName: string | null, value: string | null): string {
  if (value === null || value === '') return '（なし）';
  if (fieldName === 'status') {
    return formatStatusJa(value);
  }
  if (fieldName === 'end_at' || fieldName === 'start_at') {
    try {
      return isoToDateInput(value).replace(/-/g, '/');
    } catch {
      return value;
    }
  }
  if (fieldName === 'free_days') {
    return `${value}日`;
  }
  if (value.startsWith('{')) {
    try {
      const obj = JSON.parse(value);
      return Object.entries(obj).map(([k, v]) => `${k}: ${String(v)}`).join(', ');
    } catch {
      return value;
    }
  }
  return value;
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const { toasts, removeToast, showError } = useToast();

  const [campaign, setCampaign] = useState<CampaignDetailResponse | null>(null);
  const [formData, setFormData] = useState<CampaignEditFormData | null>(null);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [histories, setHistories] = useState<CampaignChangeHistoryWithAdmin[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // 変更履歴は「作成」を除外して編集履歴のみ
  const visibleHistories = useMemo(
    () => histories.filter((h) => h.changeType !== 'created'),
    [histories]
  );

  const isStarted = useMemo(() => {
    if (!campaign) return false;
    return new Date(campaign.startAt).getTime() <= Date.now();
  }, [campaign]);

  const loadCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = (await apiClient.getCampaign(campaignId)) as CampaignDetailResponse;
      setCampaign(data);
      setHistories(data.histories ?? []);

      const stored = sessionStorage.getItem(`campaignEditConfirmData_${campaignId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CampaignEditFormData;
          setFormData({
            name: parsed.name,
            description: parsed.description ?? '',
            code: parsed.code,
            freeDays: String(parsed.freeDays),
            startAt: parsed.startAt,
            endAt: parsed.endAt,
            status: parsed.status === 'archived' ? 'inactive' : parsed.status,
          });
          return;
        } catch {
          // 破損時はサーバー値へフォールバック
        }
      }

      setFormData({
        name: data.name,
        description: data.description ?? '',
        code: data.code,
        freeDays: String(data.freeDays),
        startAt: isoToDateInput(data.startAt),
        endAt: isoToDateInput(data.endAt),
        status: data.status === 'archived' ? 'inactive' : data.status,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'キャンペーンの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, showError]);

  useEffect(() => {
    if (!campaignId) return;
    loadCampaign();
  }, [campaignId, loadCampaign]);

  const handleChange = useCallback((field: keyof CampaignEditFormData, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const validateForm = useCallback((data: CampaignEditFormData): CampaignFormErrors => {
    const err: CampaignFormErrors = {};
    if (!data.name.trim()) err.name = 'キャンペーン名は必須です';
    else if (data.name.length > 50) err.name = 'キャンペーン名は50文字以内で入力してください';
    if (data.description && data.description.length > 500) err.description = '500文字以内で入力してください';

    if (!isStarted) {
      if (!data.code.trim()) err.code = 'キャンペーンコードは必須です';
      else if (!/^[a-z0-9]+$/.test(data.code) || data.code.length < 6 || data.code.length > 20) {
        err.code = '6〜20文字の英小文字・半角数字で入力してください';
      }
      const freeDaysNum = Number(data.freeDays);
      if (!data.freeDays) err.freeDays = '無料期間は必須です';
      else if (!Number.isInteger(freeDaysNum) || freeDaysNum < 1 || freeDaysNum > 180) {
        err.freeDays = '1〜180日の範囲で入力してください';
      }
      if (!data.startAt) {
        err.startAt = '開始日は必須です';
      } else {
        const startDate = new Date(`${data.startAt}T00:00:00+09:00`).getTime();
        const todayJst = new Date(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date()) + 'T00:00:00+09:00'
        ).getTime();
        if (startDate < todayJst) {
          err.startAt = '開始日は本日以降の日付を指定してください';
        }
      }
    }

    if (data.endAt && data.startAt) {
      const s = new Date(`${data.startAt}T00:00:00+09:00`).getTime();
      const e = new Date(`${data.endAt}T00:00:00+09:00`).getTime();
      // 同日は許可（1日だけキャンペーン想定）
      if (e < s) err.endAt = '終了日は開始日以降の日付を指定してください';
    }
    return err;
  }, [isStarted]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    sessionStorage.setItem(
      `campaignEditConfirmData_${campaignId}`,
      JSON.stringify({ ...formData, isStarted })
    );
    router.push(`/campaigns/${campaignId}/confirm`);
  }, [formData, campaignId, isStarted, validateForm, router]);

  if (isLoading || !formData || !campaign) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">キャンペーン編集</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* キャンペーン情報カード（開始後のみ・Figma に合わせて最上部に配置） */}
          {isStarted && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">キャンペーン情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">キャンペーンコード</div>
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono">
                    {formData.code}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">無料期間</div>
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    {formData.freeDays}日
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">キャンペーン実施開始日</div>
                  <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    {formData.startAt.replace(/-/g, '/')} 〜
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">{isStarted ? '編集項目' : 'キャンペーン内容'}</h2>

            {/* キャンペーン名 */}
            <div className="max-w-lg">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                キャンペーン名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                maxLength={50}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="キャンペーン名を入力(最大50文字)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <ErrorMessage message={errors.name} />
            </div>

            {/* 開始前のみ表示: キャンペーンコード */}
            {!isStarted && (
              <div className="max-w-lg">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  キャンペーンコード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  maxLength={20}
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ※ 6～20文字の英小文字・半角数字のみ（例: spring2026）
                </p>
                <ErrorMessage message={errors.code} />
              </div>
            )}

            {/* 開始前のみ表示: 無料期間 */}
            {!isStarted && (
              <div className="max-w-lg">
                <label htmlFor="freeDays" className="block text-sm font-medium text-gray-700 mb-2">
                  無料期間（最大180日） <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="freeDays"
                    min={1}
                    max={180}
                    value={formData.freeDays}
                    onChange={(e) => handleChange('freeDays', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-sm text-gray-600">日</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {FREE_DAYS_PRESETS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleChange('freeDays', String(days))}
                      className={`px-4 py-1.5 text-sm border rounded-full ${
                        formData.freeDays === String(days)
                          ? 'bg-[#e2fbe8] border-green-500 text-[#33803f]'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {days}日
                    </button>
                  ))}
                </div>
                <ErrorMessage message={errors.freeDays} />
              </div>
            )}

            {/* キャンペーン実施期間 */}
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キャンペーン実施期間
              </label>
              {isStarted ? (
                <div>
                  <span className="block text-xs text-gray-500 mb-1">終了日</span>
                  <input
                    type="date"
                    value={formData.endAt}
                    onChange={(e) => handleChange('endAt', e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <ErrorMessage message={errors.endAt} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">開始日 <span className="text-red-500">*</span></span>
                    <input
                      type="date"
                      value={formData.startAt}
                      onChange={(e) => handleChange('startAt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <ErrorMessage message={errors.startAt} />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">終了日</span>
                    <input
                      type="date"
                      value={formData.endAt}
                      onChange={(e) => handleChange('endAt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <ErrorMessage message={errors.endAt} />
                  </div>
                </div>
              )}
            </div>

            {/* 管理用メモ */}
            <div className="max-w-lg">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                管理用メモ
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={500}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="管理用メモを入力(最大500文字)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <ErrorMessage message={errors.description} />
            </div>

            {/* 開催ステータス（ラジオボタン: 有効 / 無効） */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">開催ステータス</span>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">有効</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">無効</span>
                </label>
              </div>
            </div>
          </section>

          {/* 変更履歴タイムライン（アコーディオン・デフォルト閉じる） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={() => setHistoryExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              aria-expanded={historyExpanded}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                変更履歴 <span className="text-sm text-gray-500 font-normal">({visibleHistories.length}件)</span>
              </h2>
              <Icon name={historyExpanded ? 'chevronUp' : 'chevronDown'} size="sm" />
            </button>
            {historyExpanded && (
              <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                {visibleHistories.length === 0 ? (
                  <p className="text-sm text-gray-500">まだ変更履歴はありません</p>
                ) : (
                  <ol className="space-y-4">
                    {visibleHistories.map((h) => (
                      <li key={h.id} className="border-l-2 border-green-500 pl-4 py-2">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-bold text-gray-900">
                            {formatChangeType(h.changeType)}
                          </span>
                          <span className="text-xs text-gray-500">{formatDateTime(h.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-3">
                          変更者:{' '}
                          {h.changedByAdmin?.displayName
                            ?? `${h.changedByAdmin?.lastName ?? ''} ${h.changedByAdmin?.firstName ?? ''}`.trim()
                            ?? '（不明）'}
                        </div>
                        {h.fieldName && (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600">
                              {formatFieldLabel(h.fieldName)}
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-400 line-through whitespace-pre-wrap break-words">
                                {displayFieldValue(h.fieldName, h.oldValue)}
                              </p>
                              <span className="text-gray-400 shrink-0">→</span>
                              <p className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 font-medium whitespace-pre-wrap break-words">
                                {displayFieldValue(h.fieldName, h.newValue)}
                              </p>
                            </div>
                          </div>
                        )}
                        {h.reason && (
                          <div className="text-xs text-gray-500 mt-2">理由: {h.reason}</div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex justify-center gap-4 pt-6">
            <Link href="/campaigns">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" variant="primary">
              更新内容を確認する
            </Button>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
