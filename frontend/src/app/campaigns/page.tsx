'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Icon from '@/components/atoms/Icon';
import Pagination from '@/components/molecules/Pagination';
import CampaignSearchForm, {
  type CampaignSearchFormData,
  type CampaignStatusFilter,
} from '@/components/organisms/CampaignSearchForm';
import CampaignTable from '@/components/organisms/CampaignTable';
import { apiClient } from '@/lib/api';
import type { Campaign, CampaignListResponse } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

export const dynamic = 'force-dynamic';

type PaginationData = CampaignListResponse['pagination'];

const EMPTY_FORM: CampaignSearchFormData = {
  campaignName: '',
  campaignCode: '',
  startDateFrom: '',
  startDateTo: '',
  freeDays: '',
};

const TOAST_MESSAGES: Record<string, string> = {
  created: 'キャンペーンを作成しました',
  updated: 'キャンペーンを更新しました',
  deleted: 'キャンペーンを削除しました',
  statusChanged: 'キャンペーンのステータスを変更しました',
};

function CampaignsPageContent() {
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [searchForm, setSearchForm] = useState<CampaignSearchFormData>(EMPTY_FORM);
  const [appliedSearchForm, setAppliedSearchForm] = useState<CampaignSearchFormData>(EMPTY_FORM);
  const [statusFilters, setStatusFilters] = useState<Set<CampaignStatusFilter>>(new Set());
  const [appliedStatusFilters, setAppliedStatusFilters] = useState<Set<CampaignStatusFilter>>(new Set());

  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());

  const lastFetchKeyRef = useRef<string | null>(null);
  const toastShownRef = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    const params = new URLSearchParams();
    params.append('page', pagination.page.toString());
    params.append('limit', pagination.limit.toString());
    if (appliedSearchForm.campaignName) params.append('name', appliedSearchForm.campaignName);
    if (appliedSearchForm.campaignCode) params.append('code', appliedSearchForm.campaignCode);
    if (appliedSearchForm.freeDays) params.append('freeDays', appliedSearchForm.freeDays);
    if (appliedSearchForm.startDateFrom) {
      params.append('startDateFrom', new Date(`${appliedSearchForm.startDateFrom}T00:00:00+09:00`).toISOString());
    }
    if (appliedSearchForm.startDateTo) {
      params.append('startDateTo', new Date(`${appliedSearchForm.startDateTo}T23:59:59+09:00`).toISOString());
    }
    // 3 種全選択 (= 絞り込み無し) と 0 選択は送信しない。1〜2 選択のみ Backend で絞る。
    if (appliedStatusFilters.size > 0 && appliedStatusFilters.size < 3) {
      appliedStatusFilters.forEach((s) => params.append('derivedStatus', s));
    }

    const fetchKey = params.toString();
    if (fetchKey === lastFetchKeyRef.current) return;
    lastFetchKeyRef.current = fetchKey;

    setLoading(true);
    try {
      const data = (await apiClient.getCampaigns(fetchKey)) as CampaignListResponse;
      setCampaigns(data.campaigns ?? []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('キャンペーン取得に失敗:', error);
      showError(error instanceof Error ? error.message : 'キャンペーン一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, appliedSearchForm, appliedStatusFilters, showError]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // URL クエリの toast は key を許可リストに限定して、細工リンクで任意メッセージを出せないようにする。
  useEffect(() => {
    const toastKey = searchParams?.get('toast');
    if (!toastKey || toastShownRef.current) return;
    const message = TOAST_MESSAGES[toastKey];
    if (!message) return;
    toastShownRef.current = true;
    showSuccess(message);
    const newParams = new URLSearchParams(searchParams?.toString() || '');
    newParams.delete('toast');
    const newUrl = newParams.toString() ? `/campaigns?${newParams.toString()}` : '/campaigns';
    router.replace(newUrl, { scroll: false });
  }, [searchParams, showSuccess, router]);

  const displayedCampaigns = campaigns;

  const handleInputChange = useCallback((field: keyof CampaignSearchFormData, value: string) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleToggleStatus = useCallback((status: CampaignStatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const handleSearch = useCallback(() => {
    setAppliedSearchForm(searchForm);
    setAppliedStatusFilters(new Set(statusFilters));
    setPagination((prev) => ({ ...prev, page: 1 }));
    lastFetchKeyRef.current = null;
  }, [searchForm, statusFilters]);

  const handleClear = useCallback(() => {
    setSearchForm(EMPTY_FORM);
    setAppliedSearchForm(EMPTY_FORM);
    setStatusFilters(new Set());
    setAppliedStatusFilters(new Set());
    setPagination((prev) => ({ ...prev, page: 1 }));
    lastFetchKeyRef.current = null;
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    lastFetchKeyRef.current = null;
  }, []);

  const isAllSelected = displayedCampaigns.length > 0 && displayedCampaigns.every((c) => selectedCampaigns.has(c.id));
  const isIndeterminate = !isAllSelected && displayedCampaigns.some((c) => selectedCampaigns.has(c.id));

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      if (checked) {
        displayedCampaigns.forEach((c) => next.add(c.id));
      } else {
        displayedCampaigns.forEach((c) => next.delete(c.id));
      }
      return next;
    });
  }, [displayedCampaigns]);

  const handleToggleCampaign = useCallback((campaignId: string, checked: boolean) => {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      if (checked) next.add(campaignId);
      else next.delete(campaignId);
      return next;
    });
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">キャンペーン管理</h1>
              <p className="text-gray-600">キャンペーンの管理・編集を行います</p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
                <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>
        </div>

        <CampaignSearchForm
          searchForm={searchForm}
          statusFilters={statusFilters}
          isSearchExpanded={isSearchExpanded}
          onInputChange={handleInputChange}
          onToggleStatus={handleToggleStatus}
          onSearch={handleSearch}
          onClear={handleClear}
          onToggleExpand={() => setIsSearchExpanded((v) => !v)}
        />

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        )}

        <CampaignTable
          campaigns={displayedCampaigns}
          isLoading={loading}
          selectedCampaigns={selectedCampaigns}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          pagination={{
            ...pagination,
            total: displayedCampaigns.length !== campaigns.length
              ? displayedCampaigns.length
              : pagination.total,
          }}
          onToggleAll={handleToggleAll}
          onToggleCampaign={handleToggleCampaign}
        />
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">読み込み中...</p>
            </div>
          </div>
        </AdminLayout>
      }
    >
      <CampaignsPageContent />
    </Suspense>
  );
}
