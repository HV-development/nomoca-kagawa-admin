'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import Icon from '@/components/atoms/Icon';
import ToastContainer from '@/components/molecules/toast-container';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

interface CampaignFormData {
  name: string;
  description: string;
  code: string;
  freeDays: string;
  startAt: string;
  endAt: string;
}

type CampaignFormErrors = Partial<Record<keyof CampaignFormData, string>>;

const EMPTY_FORM: CampaignFormData = {
  name: '',
  description: '',
  code: '',
  freeDays: '',
  startAt: '',
  endAt: '',
};

const FREE_DAYS_PRESETS = [7, 14, 30, 60, 90, 180];

function validateForm(data: CampaignFormData): CampaignFormErrors {
  const errors: CampaignFormErrors = {};

  if (!data.name.trim()) {
    errors.name = 'キャンペーン名は必須です';
  } else if (data.name.length > 50) {
    errors.name = 'キャンペーン名は50文字以内で入力してください';
  }

  if (data.description && data.description.length > 500) {
    errors.description = '500文字以内で入力してください';
  }

  if (!data.code.trim()) {
    errors.code = 'キャンペーンコードは必須です';
  } else if (!/^[a-z0-9]+$/.test(data.code)) {
    errors.code = '6〜20文字の英小文字・半角数字で入力してください';
  } else if (data.code.length < 6 || data.code.length > 20) {
    errors.code = '6〜20文字の英小文字・半角数字で入力してください';
  }

  const freeDaysNum = Number(data.freeDays);
  if (!data.freeDays) {
    errors.freeDays = '無料期間は必須です';
  } else if (!Number.isInteger(freeDaysNum) || freeDaysNum < 1 || freeDaysNum > 180) {
    errors.freeDays = '1〜180日の範囲で入力してください';
  }

  if (!data.startAt) {
    errors.startAt = '開始日は必須です';
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
      errors.startAt = '開始日は本日以降の日付を指定してください';
    }
  }

  if (data.endAt && data.startAt) {
    const startDate = new Date(`${data.startAt}T00:00:00+09:00`).getTime();
    const endDate = new Date(`${data.endAt}T00:00:00+09:00`).getTime();
    // 同日は許可（1日だけキャンペーン想定）
    if (endDate < startDate) {
      errors.endAt = '終了日は開始日以降の日付を指定してください';
    }
  }

  return errors;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { toasts, removeToast } = useToast();

  const [formData, setFormData] = useState<CampaignFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<CampaignFormErrors>({});

  useEffect(() => {
    const stored = sessionStorage.getItem('campaignConfirmData');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as CampaignFormData;
      setFormData(parsed);
    } catch {
      // 破損時は EMPTY_FORM のまま
    }
  }, []);

  const handleChange = useCallback((field: keyof CampaignFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setIsChecking(true);
    try {
      const res = await fetch(
        `/api/admin/campaigns/check-code?code=${encodeURIComponent(formData.code.trim())}`,
        { method: 'GET', cache: 'no-store' }
      );
      if (!res.ok) {
        setErrors({ code: '重複チェックに失敗しました。時間をおいて再度お試しください' });
        return;
      }
      const { exists } = (await res.json()) as { exists: boolean };
      if (exists) {
        setErrors({ code: 'このキャンペーンコードは使用済みです' });
        return;
      }
    } catch {
      setErrors({ code: '重複チェックに失敗しました。時間をおいて再度お試しください' });
      return;
    } finally {
      setIsChecking(false);
    }

    sessionStorage.setItem('campaignConfirmData', JSON.stringify(formData));
    router.push('/campaigns/confirm');
  }, [formData, router]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl font-bold text-gray-900">キャンペーン新規登録</h1>
            <p className="text-gray-600">新しいキャンペーンを登録します</p>
          </div>
          <Link href="/campaigns" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
            <Icon name="chevronLeft" size="sm" />
            <span className="ml-1">一覧に戻る</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
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

          {/* キャンペーンコード */}
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
              placeholder="キャンペーンコードを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 6～20文字の英小文字・半角数字のみ（例: spring2026）
            </p>
            <ErrorMessage message={errors.code} />
          </div>

          {/* 無料期間 */}
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

          {/* 実施期間 */}
          <div className="max-w-2xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キャンペーン実施期間
            </label>
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

          {/* アクションボタン */}
          <div className="flex justify-center gap-4 pt-6">
            <Link href="/campaigns">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={isChecking}>
              {isChecking ? 'チェック中...' : '登録内容を確認する'}
            </Button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
