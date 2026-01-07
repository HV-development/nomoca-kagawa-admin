'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/templates/admin-layout';
import ToastContainer from '@/components/molecules/toast-container';
import Pagination from '@/components/molecules/Pagination';
import MerchantSearchForm, { type MerchantSearchFormData, type MerchantSearchErrors } from '@/components/organisms/MerchantSearchForm';
import MerchantDetailView from '@/components/organisms/MerchantDetailView';
import MerchantTable from '@/components/organisms/MerchantTable';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { type MerchantWithDetails } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';
import { convertMerchantsToCSV, downloadCSV, generateFilename, type MerchantForCSV } from '@/utils/csvExport';

// 動的インポート：選択時のみ表示されるフローティングフッター
const FloatingFooterMerchant = dynamic(() => import('@/components/molecules/floating-footer-merchant'), {
  ssr: false,
});

// APIレスポンス用の型（日付がstringとして返される）
type Merchant = Omit<MerchantWithDetails, 'createdAt' | 'updatedAt' | 'deletedAt' | 'account' | 'shops'> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  accountEmail: string;
  status: string;
  account?: {
    email: string;
    status: string;
    displayName: string | null;
    lastLoginAt: string | null;
    passwordHash?: string | null;
  };
};

export default function MerchantsPage() {
  const auth = useAuth();
  const lastFetchKeyRef = useRef<string | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [myMerchant, setMyMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URLパラメータからトーストメッセージを表示（重複防止）
  const toastShownRef = useRef(false);
  useEffect(() => {
    const toastMessage = searchParams.get('toast');
    if (toastMessage && !toastShownRef.current) {
      toastShownRef.current = true;
      showSuccess(decodeURIComponent(toastMessage));
      // URLパラメータをクリア（履歴を置換）
      const url = new URL(window.location.href);
      url.searchParams.delete('toast');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, showSuccess, router]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  
  // 事業者アカウントかどうかを判定
  const isMerchantAccount = auth?.user?.accountType === 'merchant';
  
  // operatorロールかどうかを判定
  const isOperatorRole = auth?.user?.accountType === 'admin' && auth?.user?.role === 'operator';
  
  // チェックボックス関連の状態
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isIssuingAccount, setIsIssuingAccount] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  
  const [searchForm, setSearchForm] = useState<MerchantSearchFormData>({
    keyword: '',
    merchantName: '',
    merchantNameKana: '',
    representativeName: '',
    representativeNameKana: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    prefecture: '',
    accountStatus: '',
    contractStatus: '',
    createdAtFrom: '',
    createdAtTo: '',
  });
  const [appliedSearchForm, setAppliedSearchForm] = useState<MerchantSearchFormData>({
    keyword: '',
    merchantName: '',
    merchantNameKana: '',
    representativeName: '',
    representativeNameKana: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    prefecture: '',
    accountStatus: '',
    contractStatus: '',
    createdAtFrom: '',
    createdAtTo: '',
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchErrors, setSearchErrors] = useState<MerchantSearchErrors>({});

  // データ取得関数
  const fetchMerchants = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 事業者アカウントの場合は自分の事業者情報のみを取得
      if (isMerchantAccount) {
        const data = await apiClient.getMyMerchant();
        
        // APIレスポンス形式: {success: true, data: {...}}
        let merchantData: Merchant | null = null;
        if (data && typeof data === 'object') {
          if ('data' in data && data.data && typeof data.data === 'object') {
            merchantData = data.data as Merchant;
          }
        }
        
        if (merchantData) {
          setMyMerchant(merchantData);
        }
        return;
      }
      
      // 検索条件をAPIパラメータに変換
      const params: { page: number; limit: number; search?: string; status?: string } = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // フリーワード検索がある場合は追加
      if (appliedSearchForm.keyword) {
        params.search = appliedSearchForm.keyword;
      }

      // 契約ステータスをstatusパラメータに設定（バックエンドAPIのstatusは契約ステータスを指す）
      if (appliedSearchForm.contractStatus) {
        params.status = appliedSearchForm.contractStatus;
      }
      
      const data = await apiClient.getMerchants(params);
      
      // APIレスポンスが {success: true, data: {merchants: [], pagination: {}}} の形式の場合
      let merchantsArray: unknown[] = [];
      let paginationData = { page: 1, limit: 10, total: 0, pages: 0 };
      
      if (Array.isArray(data)) {
        merchantsArray = data;
      } else if (data && typeof data === 'object') {
        // 新しいAPIレスポンス形式: {success: true, data: {merchants: [...], pagination: {...}}}
        if ('data' in data && data.data && typeof data.data === 'object' && 'merchants' in data.data) {
          merchantsArray = (data.data as { merchants: unknown[] }).merchants || [];
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
        // 古いAPIレスポンス形式: {merchants: [...], pagination: {...}}
        else if ('merchants' in data) {
          merchantsArray = (data as { merchants: unknown[] }).merchants || [];
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
      
      setMerchants(merchantsArray as Merchant[]);
      // pageとlimitは現在の値を維持し、totalとpagesのみ更新（無限ループ防止）
      setPagination(prev => ({
        ...prev,
        total: paginationData.total ?? prev.total,
        pages: paginationData.pages ?? prev.pages,
      }));
    } catch (err: unknown) {
      console.error('事業者データの取得に失敗しました:', err);
      setError('事業者データの取得に失敗しました');
      setMerchants([]);
    } finally {
      setIsLoading(false);
    }
  };

  // データ取得
  useEffect(() => {
    if (auth?.isLoading) {
      return;
    }

    if (!auth?.user) {
      return;
    }

    const key = JSON.stringify({
      accountType: auth?.user?.accountType ?? 'unknown',
      merchantId: auth?.user?.merchantId ?? null,
      isMerchantAccount,
      page: pagination.page,
      limit: pagination.limit,
      search: appliedSearchForm,
    });

    if (lastFetchKeyRef.current === key) {
      return;
    }

    lastFetchKeyRef.current = key;

    void fetchMerchants();
  }, [
    isMerchantAccount,
    auth?.isLoading,
    auth?.user?.accountType,
    auth?.user?.merchantId,
    auth?.user?.id,
    pagination.page,
    pagination.limit,
    appliedSearchForm,
  ]);

  // バックエンドでフィルタリングされるため、フロントエンドでのフィルタリングは不要
  const filteredMerchants = merchants;

  // チェックボックス関連の関数
  useEffect(() => {
    const allCount = filteredMerchants.length;
    const selectedCount = selectedMerchants.size;
    setIsAllSelected(allCount > 0 && selectedCount === allCount);
    setIsIndeterminate(selectedCount > 0 && selectedCount < allCount);
  }, [selectedMerchants, filteredMerchants]);

  const handleInputChange = useCallback((field: keyof MerchantSearchFormData, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
    // エラーがある場合、値を変更したらエラーをクリア
    setSearchErrors(prev => {
      if (prev.createdAtFrom || prev.createdAtTo) {
        return {};
      }
      return prev;
    });
  }, []);

  const validateSearchForm = (): boolean => {
    const errors: MerchantSearchErrors = {};
    
    // 開始日のバリデーション
    if (searchForm.createdAtFrom) {
      const fromDate = new Date(searchForm.createdAtFrom);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // 今日の終わりまで
      
      if (fromDate > today) {
        errors.createdAtFrom = '開始日は今日以前の日付を指定してください';
      }
    }
    
    // 終了日のバリデーション
    if (searchForm.createdAtTo) {
      const toDate = new Date(searchForm.createdAtTo);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (toDate > today) {
        errors.createdAtTo = '終了日は今日以前の日付を指定してください';
      }
    }
    
    // 日付の範囲バリデーション
    if (searchForm.createdAtFrom && searchForm.createdAtTo) {
      const fromDate = new Date(searchForm.createdAtFrom);
      const toDate = new Date(searchForm.createdAtTo);
      
      if (fromDate > toDate) {
        errors.createdAtFrom = '開始日は終了日より前の日付を指定してください';
        errors.createdAtTo = '終了日は開始日より後の日付を指定してください';
      }
    }
    
    setSearchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSearch = useCallback(() => {
    if (!validateSearchForm()) {
      return;
    }
    // 検索フォームの内容を適用済み検索フォームにコピーして検索実行
    setAppliedSearchForm({ ...searchForm });
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchForm]);

  const handleClear = useCallback(() => {
    const emptyForm: MerchantSearchFormData = {
      keyword: '',
      merchantName: '',
      merchantNameKana: '',
      representativeName: '',
      representativeNameKana: '',
      phone: '',
      email: '',
      address: '',
      postalCode: '',
      prefecture: '',
      accountStatus: '',
      contractStatus: '',
      createdAtFrom: '',
      createdAtTo: '',
    };
    setSearchForm(emptyForm);
    setAppliedSearchForm(emptyForm);
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    if (isLoading) return;
    setPagination(prev => ({ ...prev, page }));
  }, [isLoading]);

  const handleToggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedMerchants(new Set(filteredMerchants.map(merchant => merchant.id)));
    } else {
      setSelectedMerchants(new Set());
    }
  }, [filteredMerchants]);

  const handleToggleMerchant = useCallback((merchantId: string, checked: boolean) => {
    setSelectedMerchants(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(merchantId);
      } else {
        newSelected.delete(merchantId);
      }
      return newSelected;
    });
  }, []);

  // アカウント発行処理
  const handleIssueAccount = async () => {
    if (selectedMerchants.size === 0) return;

    setIsIssuingAccount(true);
    try {
      const merchantIds = Array.from(selectedMerchants);
      const result = await apiClient.issueAccounts(merchantIds);
      
      if (result.failed === 0) {
        showSuccess(`${result.success}件の事業者にアカウントを発行しました`);
        // 選択したレコードのステータスのみを更新（inactive -> pending）
        setMerchants(prevMerchants => 
          prevMerchants.map(merchant => 
            selectedMerchants.has(merchant.id) && merchant.account
              ? { ...merchant, account: { ...merchant.account, status: 'pending' } }
              : merchant
          )
        );
      } else if (result.success > 0) {
        showSuccess(`${result.success}件のアカウントを発行しました。${result.failed}件は失敗しました。`);
        // 選択したレコードのステータスのみを更新（inactive -> pending）
        setMerchants(prevMerchants => 
          prevMerchants.map(merchant => 
            selectedMerchants.has(merchant.id) && merchant.account
              ? { ...merchant, account: { ...merchant.account, status: 'pending' } }
              : merchant
          )
        );
      } else {
        showError(`${result.failed}件のアカウント発行に失敗しました`);
      }
      
      // 選択をクリア
      setSelectedMerchants(new Set());
      setIsAllSelected(false);
      setIsIndeterminate(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`アカウント発行に失敗しました: ${errorMessage}`);
    } finally {
      setIsIssuingAccount(false);
    }
  };

  // 個別の事業者にアカウント発行（メールアイコンから）
  const handleResendRegistration = useCallback(async (merchantId: string) => {
    try {
      const result = await apiClient.issueAccounts([merchantId]);
      
      if (result.failed === 0) {
        showSuccess('アカウント発行メールを送信しました');
        // 該当レコードのステータスのみを更新（inactive -> pending）
        setMerchants(prevMerchants => 
          prevMerchants.map(merchant => 
            merchant.id === merchantId && merchant.account
              ? { ...merchant, account: { ...merchant.account, status: 'pending' } }
              : merchant
          )
        );
      } else {
        showError('アカウント発行に失敗しました');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`アカウント発行に失敗しました: ${errorMessage}`);
    }
  }, [showSuccess, showError]);

  // 全データ取得関数（ページネーション対応、検索条件適用）
  const fetchAllMerchants = async (): Promise<Merchant[]> => {
    const allMerchants: Merchant[] = [];
    let page = 1;
    const limit = 100; // 最大値を設定してページ数を減らす
    let hasMore = true;

    while (hasMore) {
      try {
        // 検索条件をクエリパラメータに追加
        const params: { page: number; limit: number; search?: string } = {
          page,
          limit,
        };

        // フリーワード検索がある場合は追加
        if (appliedSearchForm.keyword) {
          params.search = appliedSearchForm.keyword;
        }

        const data = await apiClient.getMerchants(params);

        // APIレスポンスから事業者データを抽出
        let merchantsArray: unknown[] = [];
        let paginationInfo: { totalPages?: number; total?: number } = {};

        if (Array.isArray(data)) {
          merchantsArray = data;
          hasMore = false; // 配列の場合は全データが含まれている
        } else if (data && typeof data === 'object') {
          // 新しいAPIレスポンス形式: {success: true, data: {merchants: [...], pagination: {...}}}
          if ('data' in data && data.data && typeof data.data === 'object' && 'merchants' in data.data) {
            merchantsArray = (data.data as { merchants: unknown[]; pagination?: unknown }).merchants || [];
            paginationInfo = (data.data as { pagination?: { totalPages?: number; total?: number } }).pagination || {};
          }
          // 古いAPIレスポンス形式: {merchants: [...], pagination: {...}}
          else if ('merchants' in data) {
            merchantsArray = (data as { merchants: unknown[] }).merchants || [];
            paginationInfo = (data as { pagination?: { totalPages?: number; total?: number } }).pagination || {};
          }
        }

        allMerchants.push(...(merchantsArray as Merchant[]));

        // ページネーション情報を確認
        const totalPages = paginationInfo.totalPages || 1;
        hasMore = page < totalPages;
        page++;

        // 取得したデータが0件の場合は終了
        if (merchantsArray.length === 0) {
          hasMore = false;
        }
      } catch (err) {
        console.error('全データ取得中にエラーが発生しました:', err);
        throw err;
      }
    }

    // フロントエンドのフィルタリングを適用
    return allMerchants.filter((merchant) => {
      // フリーワード検索（全フィールドを対象）
      const keyword = appliedSearchForm.keyword.toLowerCase();
      const matchesKeyword = keyword === '' || 
        merchant.id.toLowerCase().includes(keyword) ||
        merchant.name.toLowerCase().includes(keyword) ||
        merchant.nameKana.toLowerCase().includes(keyword) ||
        (!isOperatorRole && (
          `${merchant.representativeNameLast} ${merchant.representativeNameFirst}`.toLowerCase().includes(keyword) ||
          `${merchant.representativeNameLastKana} ${merchant.representativeNameFirstKana}`.toLowerCase().includes(keyword) ||
          merchant.representativePhone.includes(keyword) ||
          (merchant.account?.email || merchant.email || '').toLowerCase().includes(keyword) ||
          `${merchant.prefecture}${merchant.city}${merchant.address1}${merchant.address2}`.toLowerCase().includes(keyword)
        )) ||
        merchant.postalCode.includes(keyword);
      
      // 各項目のフィルタ
      const matchesSearch = 
        matchesKeyword &&
        (appliedSearchForm.merchantName === '' || merchant.name.toLowerCase().includes(appliedSearchForm.merchantName.toLowerCase())) &&
        (appliedSearchForm.merchantNameKana === '' || merchant.nameKana.toLowerCase().includes(appliedSearchForm.merchantNameKana.toLowerCase())) &&
        (isOperatorRole || (
          (appliedSearchForm.representativeName === '' || 
            `${merchant.representativeNameLast} ${merchant.representativeNameFirst}`.toLowerCase().includes(appliedSearchForm.representativeName.toLowerCase())) &&
          (appliedSearchForm.representativeNameKana === '' || 
            `${merchant.representativeNameLastKana} ${merchant.representativeNameFirstKana}`.toLowerCase().includes(appliedSearchForm.representativeNameKana.toLowerCase())) &&
          (appliedSearchForm.phone === '' || merchant.representativePhone.includes(appliedSearchForm.phone)) &&
          (appliedSearchForm.email === '' || (merchant.account?.email || merchant.email || '').toLowerCase().includes(appliedSearchForm.email.toLowerCase())) &&
          (appliedSearchForm.address === '' || 
            `${merchant.prefecture}${merchant.city}${merchant.address1}${merchant.address2}`.toLowerCase().includes(appliedSearchForm.address.toLowerCase()))
        )) &&
        (appliedSearchForm.postalCode === '' || merchant.postalCode.includes(appliedSearchForm.postalCode)) &&
        (appliedSearchForm.prefecture === '' || merchant.prefecture.toLowerCase().includes(appliedSearchForm.prefecture.toLowerCase())) &&
        (appliedSearchForm.accountStatus === '' || (merchant.account?.status || 'inactive') === appliedSearchForm.accountStatus) &&
        (appliedSearchForm.contractStatus === '' || merchant.status === appliedSearchForm.contractStatus);
      
      // 日付範囲のフィルタ
      let matchesDateRange = true;
      if (appliedSearchForm.createdAtFrom || appliedSearchForm.createdAtTo) {
        const merchantDate = new Date(merchant.createdAt);
        merchantDate.setHours(0, 0, 0, 0);
        
        if (appliedSearchForm.createdAtFrom && appliedSearchForm.createdAtTo) {
          const fromDate = new Date(appliedSearchForm.createdAtFrom);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(appliedSearchForm.createdAtTo);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = merchantDate >= fromDate && merchantDate <= toDate;
        } else if (appliedSearchForm.createdAtFrom) {
          const fromDate = new Date(appliedSearchForm.createdAtFrom);
          fromDate.setHours(0, 0, 0, 0);
          matchesDateRange = merchantDate >= fromDate;
        } else if (appliedSearchForm.createdAtTo) {
          const toDate = new Date(appliedSearchForm.createdAtTo);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = merchantDate <= toDate;
        }
      }
      
      return matchesSearch && matchesDateRange;
    });
  };

  // 全データをCSVダウンロード
  const handleDownloadAllCSV = useCallback(async () => {
    try {
      setIsDownloadingCSV(true);
      
      // 全データを取得
      const allMerchants = await fetchAllMerchants();
      
      // Merchant型をMerchantForCSV型に変換
      const merchantsForCSV: MerchantForCSV[] = allMerchants.map((merchant) => ({
        name: merchant.name,
        nameKana: merchant.nameKana,
        representativeNameLast: merchant.representativeNameLast,
        representativeNameFirst: merchant.representativeNameFirst,
        representativeNameLastKana: merchant.representativeNameLastKana,
        representativeNameFirstKana: merchant.representativeNameFirstKana,
        representativePhone: merchant.representativePhone,
        email: merchant.account?.email || merchant.email || merchant.accountEmail,
        postalCode: merchant.postalCode,
        prefecture: merchant.prefecture,
        city: merchant.city,
        address1: merchant.address1,
        address2: merchant.address2 || '',
        accountStatus: merchant.account?.status || 'inactive',
        contractStatus: merchant.status,
        createdAt: merchant.createdAt,
      }));

      // CSVを生成
      const csvContent = convertMerchantsToCSV(merchantsForCSV, isOperatorRole);
      
      // ファイル名を生成
      const filename = generateFilename('merchants');
      
      // CSVをダウンロード
      downloadCSV(csvContent, filename);
      
      showSuccess(`${allMerchants.length}件の事業者データをCSVでダウンロードしました`);
    } catch (err: unknown) {
      console.error('CSVダウンロードに失敗しました:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    } finally {
      setIsDownloadingCSV(false);
    }
  }, [appliedSearchForm, isOperatorRole, showSuccess, showError]);

  // 選択レコードをCSVダウンロード
  const handleDownloadSelectedCSV = useCallback(() => {
    try {
      if (selectedMerchants.size === 0) {
        showError('選択されている事業者がありません');
        return;
      }

      // 選択されたレコードを取得
      const selectedMerchantsData = filteredMerchants.filter((merchant) =>
        selectedMerchants.has(merchant.id)
      );

      // Merchant型をMerchantForCSV型に変換
      const merchantsForCSV: MerchantForCSV[] = selectedMerchantsData.map((merchant) => ({
        name: merchant.name,
        nameKana: merchant.nameKana,
        representativeNameLast: merchant.representativeNameLast,
        representativeNameFirst: merchant.representativeNameFirst,
        representativeNameLastKana: merchant.representativeNameLastKana,
        representativeNameFirstKana: merchant.representativeNameFirstKana,
        representativePhone: merchant.representativePhone,
        email: merchant.account?.email || merchant.email || merchant.accountEmail,
        postalCode: merchant.postalCode,
        prefecture: merchant.prefecture,
        city: merchant.city,
        address1: merchant.address1,
        address2: merchant.address2 || '',
        accountStatus: merchant.account?.status || 'inactive',
        contractStatus: merchant.status,
        createdAt: merchant.createdAt,
      }));

      // CSVを生成
      const csvContent = convertMerchantsToCSV(merchantsForCSV, isOperatorRole);
      
      // ファイル名を生成
      const filename = generateFilename('merchants_selected');
      
      // CSVをダウンロード
      downloadCSV(csvContent, filename);
      
      showSuccess(`${selectedMerchantsData.length}件の事業者データをCSVでダウンロードしました`);
    } catch (err: unknown) {
      console.error('CSVダウンロードに失敗しました:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    }
  }, [selectedMerchants, filteredMerchants, isOperatorRole, showSuccess, showError]);

  // 事業者アカウントの場合は自分の事業者情報のみを表示
  if (isMerchantAccount) {
    return (
      <MerchantDetailView
        merchant={myMerchant}
        isLoading={isLoading}
        error={error}
        isOperatorRole={isOperatorRole}
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">事業者管理</h1>
            <p className="text-gray-600">
              事業者の管理・編集を行います
            </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">管理者太郎</span>
              </div>
            </div>
          </div>
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

        {/* 検索フォーム */}
        <MerchantSearchForm
          searchForm={searchForm}
          searchErrors={searchErrors}
          isSearchExpanded={isSearchExpanded}
          isOperatorRole={isOperatorRole}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onToggleExpand={() => setIsSearchExpanded(!isSearchExpanded)}
        />

        {/* ページネーション */}
        {!isMerchantAccount && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
            disabled={isLoading}
          />
        )}

        {/* 事業者一覧 */}
        <MerchantTable
          merchants={filteredMerchants}
          isLoading={isLoading}
          isOperatorRole={isOperatorRole}
          isMerchantAccount={isMerchantAccount}
          selectedMerchants={selectedMerchants}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          isDownloadingCSV={isDownloadingCSV}
          pagination={pagination}
          onToggleAll={handleToggleAll}
          onToggleMerchant={handleToggleMerchant}
          onDownloadAllCSV={handleDownloadAllCSV}
          onResendRegistration={handleResendRegistration}
        />
      </div>

      <FloatingFooterMerchant
        selectedCount={selectedMerchants.size}
        onConfirmIssue={handleIssueAccount}
        isIssuingAccount={isIssuingAccount}
        alreadyIssuedCount={Array.from(selectedMerchants).filter(merchantId => {
          const merchant = filteredMerchants.find(m => m.id === merchantId);
          return merchant && merchant.account && merchant.account.passwordHash;
        }).length}
        onDownloadCSV={handleDownloadSelectedCSV}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
