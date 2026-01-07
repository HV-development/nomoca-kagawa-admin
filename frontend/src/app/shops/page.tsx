'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/templates/admin-layout';
import ToastContainer from '@/components/molecules/toast-container';
import Pagination from '@/components/molecules/Pagination';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { statusLabels, statusOptions } from '@/lib/constants/shop';
import type { Shop } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';
import { convertShopsToCSV, downloadCSV, generateFilename, type ShopForCSV } from '@/utils/csvExport';
// 分割されたコンポーネント
import ShopSearchForm from '@/components/organisms/ShopSearchForm';
import ShopDetailView from '@/components/organisms/ShopDetailView';
import ShopTable from '@/components/organisms/ShopTable';

// 動的インポート：選択時のみ表示されるフローティングフッター
const FloatingFooter = dynamic(() => import('@/components/molecules/floating-footer'), {
  ssr: false,
});

function ShopsPageContent() {
  const auth = useAuth();
  const router = useRouter();
  const lastFetchKeyRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const isMerchantAccount = auth?.user?.accountType === 'merchant';
  const isShopAccount = auth?.user?.accountType === 'shop';
  const [merchantId, setMerchantId] = useState<string | undefined>(undefined);
  const searchParamsString = searchParams?.toString() ?? '';
  const baseReturnTo = useMemo(() => (searchParamsString ? `/shops?${searchParamsString}` : '/shops'), [searchParamsString]);
  const encodedReturnTo = useMemo(() => encodeURIComponent(baseReturnTo), [baseReturnTo]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  
  // URLパラメータからmerchantIdを取得
  useEffect(() => {
    const urlMerchantId = searchParams?.get('merchantId');
    if (urlMerchantId) {
      setMerchantId(urlMerchantId);
    }
  }, [searchParams]);
  
  // 検索フォームの状態（拡張版）
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    merchantName: '',
    merchantNameKana: '',
    name: '',
    nameKana: '',
    phone: '',
    accountEmail: '',
    postalCode: '',
    prefecture: '',
    address: '',
    status: 'all' as 'all' | 'registering' | 'collection_requested' | 'approval_pending' | 'promotional_materials_preparing' | 'promotional_materials_shipping' | 'operating' | 'suspended' | 'terminated',
    createdAtFrom: '',
    createdAtTo: '',
    updatedAtFrom: '',
    updatedAtTo: '',
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // URLパラメータから検索条件を読み込んで検索フォームに反映
  useEffect(() => {
    if (!searchParams) return;
    
    const newSearchForm = {
      keyword: searchParams.get('keyword') || '',
      merchantName: searchParams.get('merchantName') || '',
      merchantNameKana: searchParams.get('merchantNameKana') || '',
      name: searchParams.get('name') || '',
      nameKana: searchParams.get('nameKana') || '',
      phone: searchParams.get('phone') || '',
      accountEmail: searchParams.get('accountEmail') || '',
      postalCode: searchParams.get('postalCode') || '',
      prefecture: searchParams.get('prefecture') || '',
      address: searchParams.get('address') || '',
      status: (searchParams.get('status') || 'all') as 'all' | 'registering' | 'collection_requested' | 'approval_pending' | 'promotional_materials_preparing' | 'promotional_materials_shipping' | 'operating' | 'suspended' | 'terminated',
      createdAtFrom: searchParams.get('createdAtFrom') || '',
      createdAtTo: searchParams.get('createdAtTo') || '',
      updatedAtFrom: searchParams.get('updatedAtFrom') || '',
      updatedAtTo: searchParams.get('updatedAtTo') || '',
    };
    
    setSearchForm(newSearchForm);
    
    // 検索条件がある場合、検索フォームを展開して表示
    const hasSearchParams = Object.values(newSearchForm).some(value => value && value !== 'all');
    if (hasSearchParams) {
      setIsSearchExpanded(true);
    }
  }, [searchParams]);

  // URLパラメータからトーストメッセージを表示（重複防止）
  const toastShownRef = useRef(false);
  useEffect(() => {
    const toast = searchParams?.get('toast');
    if (toast && !toastShownRef.current) {
      toastShownRef.current = true;
      showSuccess(toast);
      // トーストパラメータをURLから削除
      const newParams = new URLSearchParams(searchParams?.toString() || '');
      newParams.delete('toast');
      const newUrl = newParams.toString() ? `/shops?${newParams.toString()}` : '/shops';
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, showSuccess, router]);

  const [searchErrors, setSearchErrors] = useState({
    createdAtFrom: '',
    createdAtTo: '',
    updatedAtFrom: '',
    updatedAtTo: '',
  });

  // チェックボックス関連の状態を追加
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  // 事業者アカウントの場合、自分の事業者IDを取得
  useEffect(() => {
    const fetchMyMerchant = async () => {
      // 認証情報がロード中の場合は待機
      if (auth?.isLoading) {
        return;
      }
      
      if (isMerchantAccount) {
        try {
          const data = await apiClient.getMyMerchant();
          if (data && typeof data === 'object' && 'data' in data && data.data) {
            const merchantData = data.data as { id: string; name: string };
            setMerchantId(merchantData.id);
            setMerchantName(merchantData.name);
          }
        } catch (error) {
          console.error('事業者情報の取得に失敗しました:', error);
        }
      }
    };

    fetchMyMerchant();
  }, [isMerchantAccount, auth?.isLoading]);

  // 店舗アカウントの場合、自身の店舗情報のみを取得
  useEffect(() => {
    const fetchMyShop = async () => {
      // 認証情報がロード中の場合は待機
      if (auth?.isLoading) {
        return;
      }
      
      if (isShopAccount) {
        try {
          setIsLoading(true);
          const shopData = await apiClient.getMyShop() as Shop;
          setShops([shopData]);
          setIsLoading(false);
        } catch (error) {
          console.error('店舗情報の取得に失敗しました:', error);
          setError('店舗情報の取得に失敗しました');
          setIsLoading(false);
        }
      }
    };

    fetchMyShop();
  }, [isShopAccount, auth?.isLoading]);

  // データ取得（検索条件を含む）
  const fetchShops = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 検索パラメータの構築
      const queryParams = new URLSearchParams();
      
      // ページネーションパラメータを追加
      queryParams.append('page', pagination.page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      // merchantIdがあれば追加
      if (merchantId) {
        queryParams.append('merchantId', merchantId);
      }
      
      // 検索フォームの各項目を追加
      if (searchForm.keyword) queryParams.append('keyword', searchForm.keyword);
      if (searchForm.merchantName) queryParams.append('merchantName', searchForm.merchantName);
      if (searchForm.merchantNameKana) queryParams.append('merchantNameKana', searchForm.merchantNameKana);
      if (searchForm.name) queryParams.append('name', searchForm.name);
      if (searchForm.nameKana) queryParams.append('nameKana', searchForm.nameKana);
      if (searchForm.phone) queryParams.append('phone', searchForm.phone);
      if (searchForm.accountEmail) queryParams.append('accountEmail', searchForm.accountEmail);
      if (searchForm.postalCode) queryParams.append('postalCode', searchForm.postalCode);
      if (searchForm.prefecture) queryParams.append('prefecture', searchForm.prefecture);
      if (searchForm.address) queryParams.append('address', searchForm.address);
      if (searchForm.status && searchForm.status !== 'all') {
        queryParams.append('status', searchForm.status);
      }
      if (searchForm.createdAtFrom) queryParams.append('createdAtFrom', searchForm.createdAtFrom);
      if (searchForm.createdAtTo) queryParams.append('createdAtTo', searchForm.createdAtTo);
      if (searchForm.updatedAtFrom) queryParams.append('updatedAtFrom', searchForm.updatedAtFrom);
      if (searchForm.updatedAtTo) queryParams.append('updatedAtTo', searchForm.updatedAtTo);
      
      const data = await apiClient.getShops(queryParams.toString());
      
      // APIレスポンスの処理
      let shopsArray: Shop[] = [];
      let merchantInfo = null;
      let paginationData = { page: 1, limit: 10, total: 0, pages: 0 };
      
      if (Array.isArray(data)) {
        shopsArray = data as Shop[];
      } else if (data && typeof data === 'object') {
        // 新しいAPIレスポンス形式: {success: true, data: {shops: [...], pagination: {...}}}
        if ('data' in data && data.data && typeof data.data === 'object' && 'shops' in data.data) {
          shopsArray = ((data.data as { shops: Shop[]; pagination?: unknown }).shops || []) as Shop[];
          const pagination = (data.data as { pagination?: { page: number; limit: number; total: number; totalPages: number } }).pagination;
          if (pagination) {
            paginationData = {
              page: pagination.page,
              limit: pagination.limit,
              total: pagination.total,
              pages: pagination.totalPages,
            };
          }
        }
        // 古いAPIレスポンス形式: {shops: [...], pagination: {...}}
        else if ('shops' in data) {
          shopsArray = ((data as { shops: Shop[] }).shops || []) as Shop[];
          const pagination = (data as { pagination?: { page: number; limit: number; total: number; totalPages: number } }).pagination;
          if (pagination) {
            paginationData = {
              page: pagination.page,
              limit: pagination.limit,
              total: pagination.total,
              pages: pagination.totalPages,
            };
          }
        }
      }
      
      // ページネーション情報を更新（pageとlimitは維持、totalとpagesのみ更新で無限ループ防止）
      setPagination(prev => ({
        ...prev,
        total: paginationData.total ?? prev.total,
        pages: paginationData.pages ?? prev.pages,
      }));
      
      // 最初の店舗からmerchant情報を取得
      if (shopsArray.length > 0 && shopsArray[0].merchant) {
        merchantInfo = shopsArray[0].merchant;
      }
      
      setShops(shopsArray);
      
      // merchantIdがある場合のみmerchant情報を取得
      if (merchantId) {
        if (!merchantInfo) {
          try {
            const merchantData = await apiClient.getMerchant(merchantId);
            if (merchantData && typeof merchantData === 'object' && 'name' in merchantData) {
              setMerchantName((merchantData as { name: string }).name);
            }
          } catch (err) {
            console.error('Failed to fetch merchant info:', err);
          }
        } else {
          setMerchantName(merchantInfo.name);
        }
      }
    } catch (err: unknown) {
      console.error('店舗データの取得に失敗しました:', err);
      setError('店舗データの取得に失敗しました');
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, searchForm, pagination.page, pagination.limit]);

  // 初回マウント時とmerchantId変更時にデータ取得
  // 事業者アカウントの場合はmerchantIdが設定されるまで待機
  useEffect(() => {
    // 認証情報がロード中の場合は待機
    if (auth?.isLoading) {
      return;
    }
    
    // 店舗アカウントの場合は、別のuseEffectで店舗情報を取得するためスキップ
    if (isShopAccount) {
      return;
    }
    
    // 事業者アカウントの場合、merchantIdが設定されるまで待機
    if (isMerchantAccount && !merchantId) {
      return;
    }

    const key = [
      merchantId ?? 'none',
      isMerchantAccount ? 'merchant' : 'other',
      isShopAccount ? 'shop' : 'non-shop',
      auth?.user?.id ?? auth?.user?.email ?? 'anonymous',
      pagination.page,
      pagination.limit,
      JSON.stringify(searchForm),
    ].join('|');

    if (lastFetchKeyRef.current === key) {
      return;
    }

    lastFetchKeyRef.current = key;
    
    fetchShops();
  }, [merchantId, auth?.isLoading, isMerchantAccount, isShopAccount, auth?.user?.id, auth?.user?.email, fetchShops]);

  // 検索フォームの入力ハンドラー
  const handleInputChange = useCallback((field: keyof typeof searchForm, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 検索実行ハンドラー
  const handleSearch = () => {
    if (!validateSearchForm()) {
      return;
    }
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
    // URLパラメータを更新（ブラウザの戻る/進むボタンで検索条件を維持）
    const params = new URLSearchParams();
    Object.entries(searchForm).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    fetchShops();
  };

  // 日付バリデーション関数
  const validateSearchForm = (): boolean => {
    const errors: {createdAtFrom?: string; createdAtTo?: string; updatedAtFrom?: string; updatedAtTo?: string} = {};
    
    // 登録日開始日のバリデーション
    if (searchForm.createdAtFrom) {
      const fromDate = new Date(searchForm.createdAtFrom);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (fromDate > today) {
        errors.createdAtFrom = '開始日は今日以前の日付を指定してください';
      }
    }
    
    // 登録日終了日のバリデーション
    if (searchForm.createdAtTo) {
      const toDate = new Date(searchForm.createdAtTo);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (toDate > today) {
        errors.createdAtTo = '終了日は今日以前の日付を指定してください';
      }
    }
    
    // 登録日の範囲バリデーション
    if (searchForm.createdAtFrom && searchForm.createdAtTo) {
      const fromDate = new Date(searchForm.createdAtFrom);
      const toDate = new Date(searchForm.createdAtTo);
      
      if (fromDate > toDate) {
        errors.createdAtFrom = '開始日は終了日より前の日付を指定してください';
        errors.createdAtTo = '終了日は開始日より後の日付を指定してください';
      }
    }
    
    // 更新日開始日のバリデーション
    if (searchForm.updatedAtFrom) {
      const fromDate = new Date(searchForm.updatedAtFrom);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (fromDate > today) {
        errors.updatedAtFrom = '開始日は今日以前の日付を指定してください';
      }
    }
    
    // 更新日終了日のバリデーション
    if (searchForm.updatedAtTo) {
      const toDate = new Date(searchForm.updatedAtTo);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (toDate > today) {
        errors.updatedAtTo = '終了日は今日以前の日付を指定してください';
      }
    }
    
    // 更新日の範囲バリデーション
    if (searchForm.updatedAtFrom && searchForm.updatedAtTo) {
      const fromDate = new Date(searchForm.updatedAtFrom);
      const toDate = new Date(searchForm.updatedAtTo);
      
      if (fromDate > toDate) {
        errors.updatedAtFrom = '開始日は終了日より前の日付を指定してください';
        errors.updatedAtTo = '終了日は開始日より後の日付を指定してください';
      }
    }
    
    setSearchErrors({
      createdAtFrom: errors.createdAtFrom || '',
      createdAtTo: errors.createdAtTo || '',
      updatedAtFrom: errors.updatedAtFrom || '',
      updatedAtTo: errors.updatedAtTo || '',
    });
    return Object.keys(errors).length === 0;
  };

  // クリアハンドラー
  const handleClear = () => {
    setSearchForm({
      keyword: '',
      merchantName: '',
      merchantNameKana: '',
      name: '',
      nameKana: '',
      phone: '',
      accountEmail: '',
      postalCode: '',
      prefecture: '',
      address: '',
      status: 'all',
      createdAtFrom: '',
      createdAtTo: '',
      updatedAtFrom: '',
      updatedAtTo: '',
    });
    setSearchErrors({
      createdAtFrom: '',
      createdAtTo: '',
      updatedAtFrom: '',
      updatedAtTo: '',
    });
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
    // URLパラメータをクリア
    window.history.pushState({}, '', window.location.pathname);
    // クリア後にデータを再取得
    setTimeout(() => fetchShops(), 100);
  };

  // ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    if (isLoading) return;
    setPagination(prev => ({ ...prev, page }));
  }, [isLoading]);

  // チェックボックス関連の関数
  useEffect(() => {
    const allCount = shops.length;
    const selectedCount = selectedShops.size;
    setIsAllSelected(allCount > 0 && selectedCount === allCount);
    setIsIndeterminate(selectedCount > 0 && selectedCount < allCount);
  }, [selectedShops, shops]);

  const handleToggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedShops(new Set(shops.map(shop => shop.id)));
    } else {
      setSelectedShops(new Set());
    }
  }, [shops]);

  const handleToggleShop = useCallback((shopId: string, checked: boolean) => {
    setSelectedShops(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(shopId);
      } else {
        newSelected.delete(shopId);
      }
      return newSelected;
    });
  }, []);

  // 一括更新処理
  const handleBulkUpdateStatus = async (status: string) => {
    if (selectedShops.size === 0) return;

    try {
      let successCount = 0;
      let failCount = 0;

      for (const shopId of selectedShops) {
        try {
          await apiClient.updateShopStatus(shopId, { status });
          successCount++;
        } catch (error) {
          console.error(`店舗 ${shopId} の更新に失敗:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`${successCount}件のステータスを更新しました`);
      }
      if (failCount > 0) {
        showError(`${failCount}件の更新に失敗しました`);
      }

      setSelectedShops(new Set());
      fetchShops();
    } catch (error) {
      console.error('一括更新に失敗しました:', error);
      showError('一括更新に失敗しました');
    }
  };

  const handleIndividualStatusChange = async (shopId: string, newStatus: string) => {
    const originalShop = shops.find(s => s.id === shopId);
    if (!originalShop) return;

    const originalStatus = originalShop.status;

    // 楽観的更新: まずUIを更新
    setShops(prev => 
      prev.map(shop => 
        shop.id === shopId 
          ? { ...shop, status: newStatus as Shop['status'] }
          : shop
      )
    );

    try {
      await apiClient.updateShopStatus(shopId, { status: newStatus });
      showSuccess(`店舗のステータスを「${statusLabels[newStatus]}」に更新しました`);
    } catch (error: unknown) {
      // エラー時は元のステータスに戻す
      setShops(prev => 
        prev.map(shop => 
          shop.id === shopId 
            ? { ...shop, status: originalStatus }
            : shop
        )
      );
      showError(`ステータスの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // チェックボックス関連の関数を追加

  // 全データ取得関数（ページネーション対応、検索条件適用）
  const fetchAllShops = async (): Promise<Shop[]> => {
    const allShops: Shop[] = [];
    let page = 1;
    const limit = 100; // 最大値を設定してページ数を減らす
    let hasMore = true;

    while (hasMore) {
      try {
        // 検索パラメータの構築
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        
        // merchantIdがあれば追加
        if (merchantId) {
          queryParams.append('merchantId', merchantId);
        }
        
        // 検索フォームの各項目を追加
        if (searchForm.keyword) queryParams.append('keyword', searchForm.keyword);
        if (searchForm.merchantName) queryParams.append('merchantName', searchForm.merchantName);
        if (searchForm.merchantNameKana) queryParams.append('merchantNameKana', searchForm.merchantNameKana);
        if (searchForm.name) queryParams.append('name', searchForm.name);
        if (searchForm.nameKana) queryParams.append('nameKana', searchForm.nameKana);
        if (searchForm.phone) queryParams.append('phone', searchForm.phone);
        if (searchForm.accountEmail) queryParams.append('accountEmail', searchForm.accountEmail);
        if (searchForm.postalCode) queryParams.append('postalCode', searchForm.postalCode);
        if (searchForm.prefecture) queryParams.append('prefecture', searchForm.prefecture);
        if (searchForm.address) queryParams.append('address', searchForm.address);
        if (searchForm.status && searchForm.status !== 'all') {
          queryParams.append('status', searchForm.status);
        }
        if (searchForm.createdAtFrom) queryParams.append('createdAtFrom', searchForm.createdAtFrom);
        if (searchForm.createdAtTo) queryParams.append('createdAtTo', searchForm.createdAtTo);
        if (searchForm.updatedAtFrom) queryParams.append('updatedAtFrom', searchForm.updatedAtFrom);
        if (searchForm.updatedAtTo) queryParams.append('updatedAtTo', searchForm.updatedAtTo);

        const data = await apiClient.getShops(queryParams.toString());
        
        // APIレスポンスの処理
        let shopsArray: Shop[] = [];
        let pagination: { totalPages?: number; total?: number } = {};
        
        if (Array.isArray(data)) {
          shopsArray = data as Shop[];
          hasMore = false;
        } else if (data && typeof data === 'object') {
          if ('data' in data && data.data && typeof data.data === 'object' && 'shops' in data.data) {
            shopsArray = ((data.data as { shops: Shop[]; pagination?: unknown }).shops || []) as Shop[];
            pagination = (data.data as { pagination?: { totalPages?: number; total?: number } }).pagination || {};
          } else if ('shops' in data) {
            shopsArray = ((data as { shops: Shop[] }).shops || []) as Shop[];
            pagination = (data as { pagination?: { totalPages?: number; total?: number } }).pagination || {};
          }
        }

        allShops.push(...shopsArray);

        // ページネーション情報を確認
        const totalPages = pagination.totalPages || 1;
        hasMore = page < totalPages;
        page++;

        // 取得したデータが0件の場合は終了
        if (shopsArray.length === 0) {
          hasMore = false;
        }
      } catch (error) {
        console.error('全データ取得中にエラーが発生しました:', error);
        throw error;
      }
    }

    return allShops;
  };

  // 全データをCSVダウンロード
  const handleDownloadAllCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      
      // 全データを取得
      const allShops = await fetchAllShops();
      
      // Shop型をShopForCSV型に変換
      const shopsForCSV: ShopForCSV[] = allShops.map((shop) => ({
        merchantName: shop.merchant?.name,
        name: shop.name,
        nameKana: shop.nameKana || '',
        postalCode: shop.postalCode || '',
        address: shop.address || '',
        accountEmail: shop.accountEmail || '',
        phone: shop.phone || '',
        status: shop.status,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
      }));

      // CSVを生成（事業者名を表示するかどうかはmerchantIdがない場合のみ）
      const csvContent = convertShopsToCSV(shopsForCSV, !merchantId && !isMerchantAccount);
      
      // ファイル名を生成
      const filename = generateFilename('shops');
      
      // CSVをダウンロード
      downloadCSV(csvContent, filename);
      
      showSuccess(`${allShops.length}件の店舗データをCSVでダウンロードしました`);
    } catch (error: unknown) {
      console.error('CSVダウンロードに失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  // 選択レコードをCSVダウンロード
  const handleDownloadSelectedCSV = () => {
    try {
      if (selectedShops.size === 0) {
        showError('選択されている店舗がありません');
        return;
      }

      // 選択されたレコードを取得
      const selectedShopsData = shops.filter((shop) =>
        selectedShops.has(shop.id)
      );

      // Shop型をShopForCSV型に変換
      const shopsForCSV: ShopForCSV[] = selectedShopsData.map((shop) => ({
        merchantName: shop.merchant?.name,
        name: shop.name,
        nameKana: shop.nameKana || '',
        postalCode: shop.postalCode || '',
        address: shop.address || '',
        accountEmail: shop.accountEmail || '',
        phone: shop.phone || '',
        status: shop.status,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
      }));

      // CSVを生成（事業者名を表示するかどうかはmerchantIdがない場合のみ）
      const csvContent = convertShopsToCSV(shopsForCSV, !merchantId && !isMerchantAccount);
      
      // ファイル名を生成
      const filename = generateFilename('shops_selected');
      
      // CSVをダウンロード
      downloadCSV(csvContent, filename);
      
      showSuccess(`${selectedShopsData.length}件の店舗データをCSVでダウンロードしました`);
    } catch (error: unknown) {
      console.error('CSVダウンロードに失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registering': return 'text-blue-600';
      case 'collection_requested': return 'text-purple-600';
      case 'approval_pending': return 'text-yellow-600';
      case 'promotional_materials_preparing': return 'text-orange-600';
      case 'promotional_materials_shipping': return 'text-indigo-600';
      case 'operating': return 'text-green-600';
      case 'suspended': return 'text-red-600';
      case 'terminated': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {isShopAccount ? '店舗管理' : '店舗一覧'}
              </h1>
              <p className="text-gray-600">
                {isShopAccount ? '自身の店舗情報を確認できます' : '店舗の管理・編集を行います'}
              </p>
            </div>
          </div>
          
          {/* 検索条件の表示（adminアカウントのみ） */}
          {!isShopAccount && !isMerchantAccount && (() => {
            const conditions: string[] = [];
            
            // merchantIdがある場合
            if (merchantId && merchantName) {
              conditions.push(`事業者: ${merchantName}`);
            }
            
            // 検索フォームの条件
            if (searchForm.keyword) conditions.push(`キーワード: ${searchForm.keyword}`);
            if (searchForm.merchantName) conditions.push(`事業者名: ${searchForm.merchantName}`);
            if (searchForm.merchantNameKana) conditions.push(`事業者名（カナ）: ${searchForm.merchantNameKana}`);
            if (searchForm.name) conditions.push(`店舗名: ${searchForm.name}`);
            if (searchForm.nameKana) conditions.push(`店舗名（カナ）: ${searchForm.nameKana}`);
            if (searchForm.phone) conditions.push(`電話番号: ${searchForm.phone}`);
            if (searchForm.accountEmail) conditions.push(`メールアドレス: ${searchForm.accountEmail}`);
            if (searchForm.postalCode) conditions.push(`郵便番号: ${searchForm.postalCode}`);
            if (searchForm.prefecture) conditions.push(`都道府県: ${searchForm.prefecture}`);
            if (searchForm.address) conditions.push(`住所: ${searchForm.address}`);
            if (searchForm.status && searchForm.status !== 'all') {
              const statusLabel = statusOptions?.find(opt => opt.value === searchForm.status)?.label || searchForm.status;
              conditions.push(`ステータス: ${statusLabel}`);
            }
            if (searchForm.createdAtFrom && searchForm.createdAtTo) {
              conditions.push(`登録日: ${searchForm.createdAtFrom} 〜 ${searchForm.createdAtTo}`);
            } else if (searchForm.createdAtFrom) {
              conditions.push(`登録日（開始）: ${searchForm.createdAtFrom}`);
            } else if (searchForm.createdAtTo) {
              conditions.push(`登録日（終了）: ${searchForm.createdAtTo}`);
            }
            if (searchForm.updatedAtFrom && searchForm.updatedAtTo) {
              conditions.push(`更新日: ${searchForm.updatedAtFrom} 〜 ${searchForm.updatedAtTo}`);
            } else if (searchForm.updatedAtFrom) {
              conditions.push(`更新日（開始）: ${searchForm.updatedAtFrom}`);
            } else if (searchForm.updatedAtTo) {
              conditions.push(`更新日（終了）: ${searchForm.updatedAtTo}`);
            }
            
            if (conditions.length === 0) return null;
            
            return (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 mr-2">検索条件:</span>
                  <span className="text-sm text-gray-900">{conditions.join(' / ')}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <Image 
                src="/alert.svg" 
                alt="警告" 
                width={16} 
                height={16}
                className="w-4 h-4 text-red-500 mr-2"
              />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 検索フォーム（店舗アカウントの場合は非表示） */}
        {!isShopAccount && (
          <ShopSearchForm
            searchForm={searchForm}
            searchErrors={searchErrors}
            isSearchExpanded={isSearchExpanded}
            merchantId={merchantId}
            onInputChange={handleInputChange}
            onSearch={handleSearch}
            onClear={handleClear}
            onToggleExpand={() => setIsSearchExpanded(!isSearchExpanded)}
          />
        )}

        {/* ページネーション */}
        {!isShopAccount && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
            disabled={isLoading}
          />
        )}

        {/* 店舗アカウント用の詳細ビュー */}
        {isShopAccount && shops.length > 0 && shops[0] ? (
          <ShopDetailView
            shop={shops[0]}
            merchantId={merchantId}
            encodedReturnTo={encodedReturnTo}
            getStatusColor={getStatusColor}
          />
        ) : null}

        {/* 店舗一覧（管理者・事業者アカウント用） */}
        {!isShopAccount && (
          <ShopTable
            shops={shops}
            pagination={pagination}
            selectedShops={selectedShops}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            isLoading={isLoading}
            isDownloadingCSV={isDownloadingCSV}
            isMerchantAccount={isMerchantAccount}
            isShopAccount={isShopAccount}
            merchantId={merchantId}
            encodedReturnTo={encodedReturnTo}
            onToggleAll={handleToggleAll}
            onToggleShop={handleToggleShop}
            onStatusChange={handleIndividualStatusChange}
            onDownloadAllCSV={handleDownloadAllCSV}
            getStatusColor={getStatusColor}
          />
        )}
      </div>

      {!isMerchantAccount && !isShopAccount && (
        <FloatingFooter
          selectedCount={selectedShops.size}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onDownloadCSV={handleDownloadSelectedCSV}
        />
      )}
      
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function ShopsPage() {
  return (
    <Suspense fallback={
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
    }>
      <ShopsPageContent />
    </Suspense>
  );
}
