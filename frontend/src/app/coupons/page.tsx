'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import AdminLayout from '@/components/templates/admin-layout';
import Icon from '@/components/atoms/Icon';
import Pagination from '@/components/molecules/Pagination';
import CouponSearchForm, { type CouponSearchFormData, type ApprovalStatus, type PublicStatus } from '@/components/organisms/CouponSearchForm';
import CouponTable from '@/components/organisms/CouponTable';
import { apiClient } from '@/lib/api';
import type { CouponWithShop, CouponListResponse, CouponStatus } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';
import { convertCouponsToCSV, downloadCSV, generateFilename, type CouponForCSV } from '@/utils/csvExport';

// 動的インポート：選択時のみ表示されるフローティングフッター
const CouponBulkUpdateFooter = dynamicImport(() => import('@/components/molecules/coupon-bulk-update-footer'), {
  ssr: false,
});

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

interface Shop {
  id: string;
  name: string;
  merchantId: string;
  merchant?: {
    name: string;
  };
}

type PaginationData = CouponListResponse['pagination'];

function CouponsPageContent() {
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const isShopAccount = auth?.user?.accountType === 'shop';
  const isMerchantAccount = auth?.user?.accountType === 'merchant';
  const isAdminAccount = auth?.user?.accountType === 'admin';
  const searchParams = useSearchParams();
  const shopIdFromQuery = searchParams?.get('shopId') ?? undefined;
  const merchantIdFromQuery = searchParams?.get('merchantId') ?? undefined;
  const returnTo = searchParams?.get('returnTo') ?? undefined;
  const decodedReturnTo = useMemo(() => {
    if (!returnTo) return null;
    try {
      return decodeURIComponent(returnTo);
    } catch (error) {
      console.error('Failed to decode returnTo parameter:', error);
      return null;
    }
  }, [returnTo]);
  const shopId = shopIdFromQuery ?? (isShopAccount ? auth?.user?.shopId : undefined);
  const merchantId = merchantIdFromQuery ?? (isMerchantAccount ? auth?.user?.merchantId : undefined);
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [coupons, setCoupons] = useState<CouponWithShop[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchForm, setSearchForm] = useState<CouponSearchFormData>({
    merchantName: '',
    shopName: '',
    couponName: '',
  });
  const [appliedSearchForm, setAppliedSearchForm] = useState<CouponSearchFormData>({
    merchantName: '',
    shopName: '',
    couponName: '',
  });
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('all');
  const [appliedApprovalStatus, setAppliedApprovalStatus] = useState<ApprovalStatus>('all');
  const [publicStatus, setPublicStatus] = useState<PublicStatus>('all');
  const [appliedPublicStatus, setAppliedPublicStatus] = useState<PublicStatus>('all');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // チェックボックス関連の状態
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const lastCouponsFetchKeyRef = useRef<string | null>(null);
  const lastShopFetchIdRef = useRef<string | null>(null);

  // クーポン一覧の取得
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      // 店舗アカウントの場合
      if (shopId) {
        params.append('shopId', shopId);
      }

      // 事業者アカウントの場合
      if (merchantId) {
        params.append('merchantId', merchantId);
      }

      if (appliedSearchForm.merchantName) {
        params.append('merchantName', appliedSearchForm.merchantName);
      }

      if (appliedSearchForm.shopName) {
        params.append('shopName', appliedSearchForm.shopName);
      }

      if (appliedSearchForm.couponName) {
        params.append('title', appliedSearchForm.couponName);
      }

      if (appliedApprovalStatus !== 'all') {
        params.append('status', appliedApprovalStatus);
      }

      if (appliedPublicStatus !== 'all') {
        params.append('isPublic', appliedPublicStatus === 'public' ? 'true' : 'false');
      }

      const data: { coupons: CouponWithShop[]; pagination: PaginationData } = await apiClient.getCoupons(params.toString()) as { coupons: CouponWithShop[]; pagination: PaginationData };
      setCoupons(data.coupons || []);
      // pageとlimitは現在の値を維持し、totalとtotalPagesのみ更新（無限ループ防止）
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total ?? prev.total,
        totalPages: data.pagination?.totalPages ?? prev.totalPages,
      }));
    } catch (error) {
      console.error('❌ CouponsPage: Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  // 店舗情報の取得
  useEffect(() => {
    if (!shopId) {
      return;
    }

    if (lastShopFetchIdRef.current === shopId) {
      return;
    }

    lastShopFetchIdRef.current = shopId;

    const fetchShop = async () => {
      try {
        const data = await apiClient.getShop(shopId);
        setShop(data as Shop);
      } catch (error) {
        console.error('店舗情報の取得に失敗しました:', error);
      }
    };

    fetchShop();
  }, [shopId]);

  // クーポン一覧を取得
  useEffect(() => {
    // authの初期化を待つ
    if (auth?.isLoading) {
      return;
    }

    // 認証情報が取得できていない場合はスキップ
    if (!auth?.user) {
      return;
    }

    const key = JSON.stringify({
      user: auth?.user?.id ?? auth?.user?.email ?? 'anonymous',
      shopId: shopId ?? null,
      merchantId: merchantId ?? null,
      page: pagination.page,
      limit: pagination.limit,
      search: appliedSearchForm,
      approvalStatus: appliedApprovalStatus,
      publicStatus: appliedPublicStatus,
    });

    if (lastCouponsFetchKeyRef.current === key) {
      return;
    }

    lastCouponsFetchKeyRef.current = key;

    fetchCoupons();
  }, [
    auth?.isLoading,
    auth?.user,
    shopId,
    merchantId,
    pagination.page,
    pagination.limit,
    appliedSearchForm,
    appliedApprovalStatus,
    appliedPublicStatus,
  ]);

  // URLパラメータからトーストメッセージを表示（データ取得完了後、重複防止）
  const toastShownRef = useRef(false);
  useEffect(() => {
    // データ取得が完了してからトーストを表示
    if (!loading) {
      const toast = searchParams?.get('toast');
      if (toast && !toastShownRef.current) {
        toastShownRef.current = true;
        showSuccess(toast);
        // トーストパラメータをURLから削除
        const newParams = new URLSearchParams(searchParams?.toString() || '');
        newParams.delete('toast');
        const newUrl = newParams.toString() ? `/coupons?${newParams.toString()}` : '/coupons';
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [loading, searchParams, showSuccess, router]);

  const filteredCoupons = coupons;

  const handleInputChange = useCallback((field: keyof CouponSearchFormData, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSearch = useCallback(() => {
    // 検索フォームの内容を適用済み検索フォームにコピーして検索実行
    setAppliedSearchForm(searchForm);
    setAppliedApprovalStatus(approvalStatus);
    setAppliedPublicStatus(publicStatus);
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
    // キャッシュをリセットして強制的に再フェッチ
    lastCouponsFetchKeyRef.current = null;
  }, [searchForm, approvalStatus, publicStatus]);

  const handleClear = useCallback(() => {
    const emptyForm: CouponSearchFormData = {
      merchantName: '',
      shopName: '',
      couponName: '',
    };
    setSearchForm(emptyForm);
    setApprovalStatus('all');
    setPublicStatus('all');
    setAppliedSearchForm(emptyForm);
    setAppliedApprovalStatus('all');
    setAppliedPublicStatus('all');
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
    // キャッシュをリセットして強制的に再フェッチ
    lastCouponsFetchKeyRef.current = null;
  }, []);

  // ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    if (loading) return;
    setPagination(prev => ({ ...prev, page }));
  }, [loading]);

  const handleStatusChange = useCallback(async (couponId: string, status: string) => {
    // adminアカウントのみ承認ステータスの変更を許可
    if (!isAdminAccount) {
      showError('承認ステータスの変更は管理者のみ可能です');
      return;
    }

    // 元の状態を保存
    const originalCoupon = coupons.find(c => c.id === couponId);
    if (!originalCoupon) return;
    const originalStatus = originalCoupon.status;
    const originalIsPublic = originalCoupon.isPublic;

    // 申請中または停止中に変更する場合は公開ステータスも非公開にする
    const shouldUpdatePublicStatus = (status === 'pending' || status === 'suspended') && originalIsPublic;
    const newIsPublic = (status === 'pending' || status === 'suspended') ? false : originalIsPublic;

    // UIを即座に更新（オプティミスティックアップデート）
    setCoupons(prevCoupons =>
      prevCoupons.map(coupon =>
        coupon.id === couponId
          ? { ...coupon, status: status as CouponStatus, isPublic: newIsPublic }
          : coupon
      )
    );

    // 非同期でAPIを呼び出し
    try {
      // 承認ステータスの更新
      await apiClient.updateCouponStatus(couponId, { status: status as CouponStatus });

      // 停止中に変更する場合は公開ステータスも更新
      if (shouldUpdatePublicStatus) {
        await apiClient.updateCouponPublicStatus(couponId, { isPublic: false });
      }

      const message = shouldUpdatePublicStatus
        ? 'ステータスを更新しました（公開ステータスを非公開に変更しました）'
        : 'ステータスを更新しました';
      showSuccess(message);
    } catch (error) {
      console.error('ステータスの更新に失敗しました:', error);
      // エラーが発生した場合は元の状態に戻す
      setCoupons(prevCoupons =>
        prevCoupons.map(coupon =>
          coupon.id === couponId
            ? { ...coupon, status: originalStatus, isPublic: originalIsPublic }
            : coupon
        )
      );

      // エラーメッセージを取得
      let errorMessage = 'ステータスの更新に失敗しました';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      showError(errorMessage);
    }
  }, [isAdminAccount, coupons, showSuccess, showError]);

  const handlePublicStatusChange = useCallback(async (couponId: string, isPublic: boolean) => {
    // 元の状態を保存
    const originalCoupon = coupons.find(c => c.id === couponId);
    if (!originalCoupon) return;
    const originalIsPublic = originalCoupon.isPublic;

    // UIを即座に更新（オプティミスティックアップデート）
    setCoupons(prevCoupons =>
      prevCoupons.map(coupon =>
        coupon.id === couponId ? { ...coupon, isPublic } : coupon
      )
    );

    // 非同期でAPIを呼び出し
    try {
      await apiClient.updateCouponPublicStatus(couponId, { isPublic });
      showSuccess('公開ステータスを更新しました');
    } catch (error) {
      console.error('公開ステータスの更新に失敗しました:', error);
      // エラーが発生した場合は元の状態に戻す
      setCoupons(prevCoupons =>
        prevCoupons.map(coupon =>
          coupon.id === couponId ? { ...coupon, isPublic: originalIsPublic } : coupon
        )
      );

      // エラーメッセージを取得
      let errorMessage = '公開ステータスの更新に失敗しました';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      showError(errorMessage);
    }
  }, [coupons, showSuccess, showError]);

  // チェックボックス関連の関数
  useEffect(() => {
    const allCount = filteredCoupons.length;
    const selectedCount = selectedCoupons.size;
    setIsAllSelected(allCount > 0 && selectedCount === allCount);
    setIsIndeterminate(selectedCount > 0 && selectedCount < allCount);
  }, [selectedCoupons, filteredCoupons]);

  const handleToggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedCoupons(new Set(filteredCoupons.map(coupon => coupon.id)));
    } else {
      setSelectedCoupons(new Set());
    }
  }, [filteredCoupons]);

  const handleToggleCoupon = useCallback((couponId: string, checked: boolean) => {
    setSelectedCoupons(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(couponId);
      } else {
        newSelected.delete(couponId);
      }
      return newSelected;
    });
  }, []);

  // 一括更新関数
  const handleBulkUpdateStatus = async (status: string) => {
    // adminアカウントのみ承認ステータスの変更を許可
    if (!isAdminAccount) {
      showError('承認ステータスの変更は管理者のみ可能です');
      return;
    }

    setIsUpdating(true);
    try {
      let successCount = 0;
      let failCount = 0;
      let publicStatusUpdatedCount = 0;

      // 申請中または停止中に変更する場合は公開ステータスも非公開にする
      const shouldUpdatePublicStatus = status === 'pending' || status === 'suspended';

      for (const couponId of selectedCoupons) {
        try {
          // 承認ステータスの更新
          await apiClient.updateCouponStatus(couponId, { status: status as CouponStatus });

          // 停止中に変更する場合、かつ公開中の場合は公開ステータスも更新
          if (shouldUpdatePublicStatus) {
            const coupon = filteredCoupons.find(c => c.id === couponId);
            if (coupon && coupon.isPublic) {
              try {
                await apiClient.updateCouponPublicStatus(couponId, { isPublic: false });
                publicStatusUpdatedCount++;
              } catch (publicStatusError) {
                console.error(`クーポン ${couponId} の公開ステータス更新に失敗:`, publicStatusError);
                // 公開ステータスの更新に失敗しても、承認ステータスの更新は成功しているので続行
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error(`クーポン ${couponId} の更新に失敗:`, error);
          failCount++;
        }
      }

      // 成功メッセージの構築
      if (successCount > 0) {
        let message = `${successCount}件のステータスを更新しました`;
        if (shouldUpdatePublicStatus && publicStatusUpdatedCount > 0) {
          message += `（${publicStatusUpdatedCount}件の公開ステータスを非公開に変更しました）`;
        }
        showSuccess(message);
      }
      if (failCount > 0) {
        showError(`${failCount}件の更新に失敗しました`);
      }

      setSelectedCoupons(new Set());
      fetchCoupons();
    } catch (error) {
      console.error('一括更新に失敗しました:', error);
      showError('一括更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdatePublicStatus = async (isPublic: boolean) => {
    setIsUpdating(true);
    try {
      let successCount = 0;
      let excludedCount = 0;
      let failCount = 0;

      for (const couponId of selectedCoupons) {
        const coupon = filteredCoupons.find(c => c.id === couponId);

        // 未承認のクーポンをチェック（全アカウント共通）
        const couponStatus = coupon?.status;
        if (coupon && couponStatus !== 'approved' && isPublic) {
          excludedCount++;
          continue;
        }

        try {
          await apiClient.updateCouponPublicStatus(couponId, { isPublic });
          successCount++;
        } catch (error) {
          console.error(`クーポン ${couponId} の更新に失敗:`, error);
          failCount++;
        }
      }

      if (excludedCount > 0) {
        showError(`${excludedCount}件の未承認クーポンは除外されました`);
      }
      if (successCount > 0) {
        showSuccess(`${successCount}件の公開ステータスを更新しました`);
      }
      if (failCount > 0) {
        showError(`${failCount}件の更新に失敗しました`);
      }

      setSelectedCoupons(new Set());
      fetchCoupons();
    } catch (error) {
      console.error('一括更新に失敗しました:', error);
      showError('一括更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  // 全データ取得関数（ページネーション対応、検索条件適用）
  const fetchAllCoupons = async (): Promise<CouponWithShop[]> => {
    const allCoupons: CouponWithShop[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (shopId) {
          params.append('shopId', shopId);
        }

        if (merchantId) {
          params.append('merchantId', merchantId);
        }

        if (appliedSearchForm.merchantName) {
          params.append('merchantName', appliedSearchForm.merchantName);
        }

        if (appliedSearchForm.shopName) {
          params.append('shopName', appliedSearchForm.shopName);
        }

        if (appliedSearchForm.couponName) {
          params.append('title', appliedSearchForm.couponName);
        }

        if (appliedApprovalStatus !== 'all') {
          params.append('status', appliedApprovalStatus);
        }

        if (appliedPublicStatus !== 'all') {
          params.append('isPublic', appliedPublicStatus === 'public' ? 'true' : 'false');
        }

        const data: { coupons: CouponWithShop[]; pagination: PaginationData } = await apiClient.getCoupons(params.toString()) as { coupons: CouponWithShop[]; pagination: PaginationData };

        const couponsArray = data.coupons || [];
        const paginationData = data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

        allCoupons.push(...couponsArray);

        const totalPages = paginationData.totalPages || 1;
        hasMore = page < totalPages;
        page++;

        if (couponsArray.length === 0) {
          hasMore = false;
        }
      } catch (error) {
        console.error('全データ取得中にエラーが発生しました:', error);
        throw error;
      }
    }

    return allCoupons;
  };

  // 全データをCSVダウンロード
  const handleDownloadAllCSV = useCallback(async () => {
    try {
      setIsDownloadingCSV(true);

      const allCoupons = await fetchAllCoupons();

      const couponsForCSV: CouponForCSV[] = allCoupons.map((coupon) => ({
        merchantName: coupon.shop?.merchant?.name,
        shopName: coupon.shop?.name,
        title: coupon.title,
        status: coupon.status,
        isPublic: coupon.isPublic,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
      }));

      const csvContent = convertCouponsToCSV(couponsForCSV, !shopId && !merchantId);
      const filename = generateFilename('coupons');
      downloadCSV(csvContent, filename);

      showSuccess(`${allCoupons.length}件のクーポンデータをCSVでダウンロードしました`);
    } catch (error: unknown) {
      console.error('CSVダウンロードに失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    } finally {
      setIsDownloadingCSV(false);
    }
  }, [shopId, merchantId, appliedSearchForm, appliedApprovalStatus, appliedPublicStatus, showSuccess, showError]);

  // 選択レコードをCSVダウンロード
  const handleDownloadSelectedCSV = useCallback(() => {
    try {
      if (selectedCoupons.size === 0) {
        showError('選択されているクーポンがありません');
        return;
      }

      const selectedCouponsData = filteredCoupons.filter((coupon) =>
        selectedCoupons.has(coupon.id)
      );

      const couponsForCSV: CouponForCSV[] = selectedCouponsData.map((coupon) => ({
        merchantName: coupon.shop?.merchant?.name,
        shopName: coupon.shop?.name,
        title: coupon.title,
        status: coupon.status,
        isPublic: coupon.isPublic,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
      }));

      const csvContent = convertCouponsToCSV(couponsForCSV, !shopId && !merchantId);
      const filename = generateFilename('coupons_selected');
      downloadCSV(csvContent, filename);

      showSuccess(`${selectedCouponsData.length}件のクーポンデータをCSVでダウンロードしました`);
    } catch (error: unknown) {
      console.error('CSVダウンロードに失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    }
  }, [selectedCoupons, filteredCoupons, shopId, merchantId, showSuccess, showError]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {shopId && shop && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (decodedReturnTo) {
                        router.push(decodedReturnTo);
                      } else {
                        router.back();
                      }
                    }}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
                  >
                    <Icon name="chevronLeft" size="sm" />
                    <span className="ml-1">店舗一覧に戻る</span>
                  </button>
                  <div className="text-sm text-gray-600">
                    {shop.merchant?.name && (
                      <span className="font-medium">{shop.merchant.name}</span>
                    )}
                    {shop.merchant?.name && shop.name && ' / '}
                    {shop.name && <span className="font-medium">{shop.name}</span>}
                  </div>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                {isShopAccount ? 'クーポン管理' : (shopId ? '店舗クーポン管理' : 'クーポン管理')}
              </h1>
              <p className="text-gray-600">
                {isShopAccount
                  ? '自身の店舗のクーポンを管理します'
                  : (shopId
                    ? 'この店舗のクーポンを管理します'
                    : 'クーポンの管理・編集を行います')
                }
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
                <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 検索フォーム（店舗アカウントの場合は非表示） */}
        {!isShopAccount && (
          <CouponSearchForm
            searchForm={searchForm}
            approvalStatus={approvalStatus}
            publicStatus={publicStatus}
            isSearchExpanded={isSearchExpanded}
            onInputChange={handleInputChange}
            onApprovalStatusChange={setApprovalStatus}
            onPublicStatusChange={setPublicStatus}
            onSearch={handleSearch}
            onClear={handleClear}
            onToggleExpand={() => setIsSearchExpanded(!isSearchExpanded)}
          />
        )}

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        )}

        {/* クーポン一覧 */}
        <CouponTable
          coupons={filteredCoupons}
          isLoading={loading}
          isAdminAccount={isAdminAccount}
          shopId={shopId}
          selectedCoupons={selectedCoupons}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          isDownloadingCSV={isDownloadingCSV}
          pagination={pagination}
          onToggleAll={handleToggleAll}
          onToggleCoupon={handleToggleCoupon}
          onDownloadAllCSV={handleDownloadAllCSV}
          onStatusChange={handleStatusChange}
          onPublicStatusChange={handlePublicStatusChange}
        />
      </div>
      <CouponBulkUpdateFooter
        selectedCount={selectedCoupons.size}
        isAdminAccount={isAdminAccount}
        isMerchantAccount={isMerchantAccount}
        isShopAccount={isShopAccount}
        onBulkUpdateStatus={handleBulkUpdateStatus}
        onBulkUpdatePublicStatus={handleBulkUpdatePublicStatus}
        isUpdating={isUpdating}
        unapprovedCount={Array.from(selectedCoupons).filter(couponId => {
          const coupon = filteredCoupons.find(c => c.id === couponId);
          return coupon && coupon.status !== 'approved';
        }).length}
        onDownloadCSV={handleDownloadSelectedCSV}
      />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function CouponsPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-500">読み込み中...</p>
              </div>
            </div>
          </div>
        </AdminLayout>
      }
    >
      <CouponsPageContent />
    </Suspense>
  );
}
