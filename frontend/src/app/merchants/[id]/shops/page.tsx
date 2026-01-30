'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import ToastContainer from '@/components/molecules/toast-container';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { statusLabels, statusOptions } from '@/lib/constants/shop';
import type { Shop } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';
import Checkbox from '@/components/atoms/Checkbox';
import { convertShopsToCSV, downloadCSV, generateFilename, type ShopForCSV } from '@/utils/csvExport';

// 動的インポート：選択時のみ表示されるフローティングフッター
const FloatingFooter = dynamic(() => import('@/components/molecules/floating-footer'), {
  ssr: false,
});

export default function MerchantShopsPage() {
  const params = useParams();
  const merchantId = params.id as string;
  const lastFetchKeyRef = useRef<string | null>(null);
  const baseReturnTo = useMemo(() => `/merchants/${merchantId}/shops`, [merchantId]);
  const encodedReturnTo = useMemo(() => encodeURIComponent(baseReturnTo), [baseReturnTo]);
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const [shops, setShops] = useState<Shop[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // 検索フォームの状態（拡張版）
  const [searchForm, setSearchForm] = useState({
    keyword: '',
    name: '',
    nameKana: '',
    phone: '',
    accountEmail: '',
    postalCode: '',
    prefecture: '',
    city: '',
    status: 'all' as 'all' | 'registering' | 'collection_requested' | 'approval_pending' | 'promotional_materials_preparing' | 'promotional_materials_shipping' | 'operating' | 'suspended' | 'terminated',
  });
  // 検索ボタン押下時に適用される検索条件
  const [appliedSearchForm, setAppliedSearchForm] = useState({
    keyword: '',
    name: '',
    nameKana: '',
    phone: '',
    accountEmail: '',
    postalCode: '',
    prefecture: '',
    city: '',
    status: 'all' as 'all' | 'registering' | 'collection_requested' | 'approval_pending' | 'promotional_materials_preparing' | 'promotional_materials_shipping' | 'operating' | 'suspended' | 'terminated',
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const canSelectShops = useMemo(() => {
    if (!auth?.user) return false;
    return auth.user.accountType === 'admin' && auth.user.role === 'sysadmin';
  }, [auth?.user]);

  // データ取得（検索条件を含む）
  const fetchShops = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 検索パラメータの構築
      const queryParams = new URLSearchParams();
      
      // merchantIdがあれば追加
      if (merchantId) {
        queryParams.append('merchantId', merchantId);
      }
      
      // 検索フォームの各項目を追加（適用済みの検索条件を使用）
      if (appliedSearchForm.keyword) queryParams.append('keyword', appliedSearchForm.keyword);
      if (appliedSearchForm.name) queryParams.append('name', appliedSearchForm.name);
      if (appliedSearchForm.nameKana) queryParams.append('nameKana', appliedSearchForm.nameKana);
      if (appliedSearchForm.phone) queryParams.append('phone', appliedSearchForm.phone);
      if (appliedSearchForm.accountEmail) queryParams.append('accountEmail', appliedSearchForm.accountEmail);
      if (appliedSearchForm.postalCode) queryParams.append('postalCode', appliedSearchForm.postalCode);
      if (appliedSearchForm.prefecture) queryParams.append('prefecture', appliedSearchForm.prefecture);
      if (appliedSearchForm.city) queryParams.append('city', appliedSearchForm.city);
      if (appliedSearchForm.status && appliedSearchForm.status !== 'all') {
        queryParams.append('status', appliedSearchForm.status);
      }
      
      const data = await apiClient.getShops(queryParams.toString());
      
      // APIレスポンスの処理
      let shopsArray: Shop[] = [];
      let merchantInfo = null;
      
      if (Array.isArray(data)) {
        shopsArray = data as Shop[];
      } else if (data && typeof data === 'object') {
        // 新しいAPIレスポンス形式: {success: true, data: {shops: [...], pagination: {...}}}
        if ('data' in data && data.data && typeof data.data === 'object' && 'shops' in data.data) {
          shopsArray = ((data.data as { shops: Shop[] }).shops || []) as Shop[];
        }
        // 古いAPIレスポンス形式: {shops: [...], pagination: {...}}
        else if ('shops' in data) {
          shopsArray = ((data as { shops: Shop[] }).shops || []) as Shop[];
        }
      }
      
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
  };

  // 初回マウント時とmerchantId変更時にデータ取得
  useEffect(() => {
    const key = JSON.stringify({
      merchantId: merchantId ?? 'all',
      search: appliedSearchForm,
    });

    if (lastFetchKeyRef.current === key) {
      return;
    }

    lastFetchKeyRef.current = key;
    fetchShops();
  }, [merchantId, appliedSearchForm]);

  // 検索フォームの入力ハンドラー
  const handleInputChange = (field: keyof typeof searchForm, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 検索実行ハンドラー
  const handleSearch = () => {
    // 検索条件を適用
    setAppliedSearchForm({ ...searchForm });
    // キャッシュをリセットして強制的に再フェッチ
    lastFetchKeyRef.current = null;
  };

  // クリアハンドラー
  const handleClear = () => {
    const clearedForm = {
      keyword: '',
      name: '',
      nameKana: '',
      phone: '',
      accountEmail: '',
      postalCode: '',
      prefecture: '',
      city: '',
      status: 'all' as const,
    };
    setSearchForm(clearedForm);
    setAppliedSearchForm(clearedForm);
    // キャッシュをリセットして強制的に再フェッチ
    lastFetchKeyRef.current = null;
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

  useEffect(() => {
    const allCount = shops.length;
    const selectedCount = selectedShops.size;
    setIsAllSelected(allCount > 0 && selectedCount === allCount);
    setIsIndeterminate(selectedCount > 0 && selectedCount < allCount);
  }, [selectedShops, shops]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedShops(new Set(shops.map(shop => shop.id)));
    } else {
      setSelectedShops(new Set());
    }
  };

  const handleToggleShop = (shopId: string, checked: boolean) => {
    setSelectedShops(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(shopId);
      } else {
        next.delete(shopId);
      }
      return next;
    });
  };

  const handleDownloadCSVForShops = async (shopIds: string[]) => {
    try {
      if (shopIds.length === 0) {
        showError('選択されている店舗がありません');
        return;
      }

      const selectedShopsData = shops.filter((shop) => shopIds.includes(shop.id));

      if (selectedShopsData.length === 0) {
        showError('選択された店舗が見つかりません');
        return;
      }

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

      const csvContent = convertShopsToCSV(shopsForCSV, false);
      const filename = generateFilename('shops');

      downloadCSV(csvContent, filename);
      showSuccess(`${selectedShopsData.length}件の店舗データをCSVでダウンロードしました`);
    } catch (error: unknown) {
      console.error('CSVダウンロードに失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    if (!status) {
      showError('ステータスを選択してください');
      return;
    }

    const targetIds = Array.from(selectedShops);
    if (targetIds.length === 0) {
      showError('選択されている店舗がありません');
      return;
    }

    setIsBulkUpdating(true);

    try {
      await Promise.all(
        targetIds.map((shopId) =>
          apiClient.updateShopStatus(shopId, { status })
        )
      );

      setShops((prev) =>
        prev.map((shop) =>
          targetIds.includes(shop.id)
            ? { ...shop, status: status as Shop['status'] }
            : shop
        )
      );

      showSuccess(`${targetIds.length}件の店舗ステータスを更新しました`);
      setSelectedShops(new Set(targetIds));
    } catch (error: unknown) {
      console.error('ステータスの一括更新に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      showError(`ステータスの一括更新に失敗しました: ${errorMessage}`);
    } finally {
      setIsBulkUpdating(false);
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">店舗データを読み込み中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">店舗一覧</h1>
              <p className="text-gray-600">
                店舗の管理・編集を行います
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>
          
          {/* 親事業者名の表示 */}
          {merchantName && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">事業者名:</span>
                <span className="text-sm font-bold text-gray-900">{merchantName}</span>
              </div>
            </div>
          )}
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="pb-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">検索条件</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="flex items-center focus:outline-none"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <span className={`text-gray-600 text-sm transition-transform duration-200 ${isSearchExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </Button>
          </div>
          
          {isSearchExpanded && (
          <div className="p-6">
            {/* フリーワード検索 */}
            <div className="mb-4">
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                フリーワード検索
              </label>
              <input
                type="text"
                id="keyword"
                placeholder="店舗名、住所、電話番号などで検索（2文字以上）"
                value={searchForm.keyword}
                onChange={(e) => handleInputChange('keyword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 店舗名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                店舗名
              </label>
              <input
                type="text"
                id="name"
                placeholder="店舗名を入力"
                value={searchForm.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 店舗名（カナ） */}
            <div>
              <label htmlFor="nameKana" className="block text-sm font-medium text-gray-700 mb-2">
                店舗名（カナ）
              </label>
              <input
                type="text"
                id="nameKana"
                placeholder="店舗名（カナ）を入力"
                value={searchForm.nameKana}
                onChange={(e) => handleInputChange('nameKana', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="text"
                id="accountEmail"
                placeholder="メールアドレスを入力"
                value={searchForm.accountEmail}
                onChange={(e) => handleInputChange('accountEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="text"
                id="phone"
                placeholder="電話番号を入力"
                value={searchForm.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 郵便番号 */}
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                郵便番号
              </label>
              <input
                type="text"
                id="postalCode"
                placeholder="郵便番号を入力"
                value={searchForm.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 都道府県 */}
            <div>
              <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-2">
                都道府県
              </label>
              <input
                type="text"
                id="prefecture"
                placeholder="都道府県を入力"
                value={searchForm.prefecture}
                onChange={(e) => handleInputChange('prefecture', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* 市区町村 */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                市区町村
              </label>
              <input
                type="text"
                id="city"
                placeholder="市区町村を入力"
                value={searchForm.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* ステータス */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                id="status"
                value={searchForm.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">すべて</option>
                {statusOptions?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            </div>

            {/* 検索・クリアボタン */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={handleClear}>
                クリア
              </Button>
              <Button variant="primary" onClick={handleSearch}>
                検索
              </Button>
            </div>
          </div>
          )}
        </div>

        {/* 店舗一覧 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              店舗一覧 ({shops.length}件)
            </h3>
            <Link
              href={{
                pathname: merchantId ? `/merchants/${merchantId}/shops/new` : '/shops/new',
                query: { returnTo: encodedReturnTo },
              }}
            >
              <Button variant="outline" className="bg-white text-green-600 border-green-600 hover:bg-green-50 cursor-pointer">
                <span className="mr-2">+</span>
                新規登録
              </Button>
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  {canSelectShops && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleToggleAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 whitespace-nowrap">
                    アクション
                  </th>
                  {!merchantId && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    事業者名
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    店舗名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                    住所
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    電話番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    {canSelectShops && (
                      <td className="px-6 py-4 whitespace-nowrap w-32">
                        <Checkbox
                          checked={selectedShops.has(shop.id)}
                          onChange={(checked) => handleToggleShop(shop.id, checked)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap w-32">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={{
                            pathname: `/merchants/${merchantId || shop.merchantId}/shops/${shop.id}/edit`,
                            query: { returnTo: encodedReturnTo },
                          }}
                        >
                          <button 
                            className="p-2 text-green-600 hover:text-green-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
                            title="編集"
                          >
                            <Image 
                              src="/edit.svg" 
                              alt="編集" 
                              width={24}
                              height={24}
                              className="w-6 h-6 flex-shrink-0"
                            />
                          </button>
                        </Link>
                        <Link
                          href={{
                            pathname: '/coupons',
                            query: {
                              shopId: shop.id,
                              ...(merchantId ? { merchantId } : {}),
                              returnTo: encodedReturnTo,
                            },
                          }}
                          prefetch={false}
                        >
                          <button 
                            className="p-2 text-orange-600 hover:text-orange-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[48px] min-h-[48px]"
                            title="クーポン管理"
                          >
                            <Image 
                              src="/coupon.svg" 
                              alt="クーポン" 
                              width={48}
                              height={48}
                              className="w-10 h-10"
                            />
                          </button>
                        </Link>
                      </div>
                    </td>
                    {!merchantId && (
                      <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                        <div className="text-sm font-medium text-gray-900">
                          {shop.merchant?.name || '-'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="text-sm font-medium text-gray-900">{shop.name}</div>
                      {shop.nameKana && (
                        <div className="text-sm text-gray-500">{shop.nameKana}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 min-w-[250px]">
                      <div className="text-sm text-gray-900">
                        {shop.postalCode ? `〒${shop.postalCode}` : '-'}
                      </div>
                      <div className="text-sm text-gray-900 mt-1">
                        {shop.address || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="text-sm text-gray-900">{shop.accountEmail || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                      <div className="text-sm text-gray-900">{shop.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                      <select
                        value={shop.status}
                        onChange={(e) => handleIndividualStatusChange(shop.id, e.target.value)}
                        className={`text-sm font-medium rounded-lg px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 w-full ${getStatusColor(shop.status)}`}
                      >
                        {statusOptions?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        )) || (
                          <option value={shop.status}>{statusLabels[shop.status] || shop.status}</option>
                        )}
                      </select>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>

          {shops.length === 0 && (
            <div className="text-center py-12">
              <Image 
                src="/storefront-icon.svg" 
                alt="店舗" 
                width={48} 
                height={48}
                className="mx-auto text-gray-400 mb-4"
              />
              <h3 className="text-lg font-medium text-gray-900 mb-2">店舗が見つかりません</h3>
              <p className="text-gray-500">検索条件を変更してお試しください。</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      {canSelectShops && selectedShops.size > 0 && (
        <FloatingFooter
          selectedCount={selectedShops.size}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          isUpdating={isBulkUpdating}
          onDownloadCSV={() => handleDownloadCSVForShops(Array.from(selectedShops))}
        />
      )}
    </AdminLayout>
  );
}
