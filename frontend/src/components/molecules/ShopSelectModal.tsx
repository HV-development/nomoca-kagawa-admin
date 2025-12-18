'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import type { Shop } from '@hv-development/schemas';

interface ShopSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (shop: Shop) => void;
  selectedShopId?: string;
  merchantId?: string; // 事業者でフィルタリングする場合に使用
}

const ITEMS_PER_PAGE = 10;

function ShopSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedShopId,
  merchantId,
}: ShopSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentSearch, setCurrentSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // データ取得関数
  const fetchShops = useCallback(async (searchTerm: string, pageNum: number, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) {
        queryParams.append('name', searchTerm);
      }
      if (merchantId) {
        queryParams.append('merchantId', merchantId);
      }
      queryParams.append('page', pageNum.toString());
      queryParams.append('limit', ITEMS_PER_PAGE.toString());

      const response = await apiClient.getShops(queryParams.toString());

      let fetchedShops: Shop[] = [];
      let totalPages = 1;

      if (response && typeof response === 'object') {
        if ('data' in response && response.data && typeof response.data === 'object' && 'shops' in response.data) {
          fetchedShops = (response.data as { shops: Shop[] }).shops || [];
        } else if ('shops' in response) {
          fetchedShops = (response as { shops: Shop[] }).shops || [];
        } else if (Array.isArray(response)) {
          fetchedShops = response as Shop[];
        }

        // pagination情報を取得
        if ('pagination' in response && response.pagination && typeof response.pagination === 'object') {
          const pagination = response.pagination as { totalPages?: number };
          totalPages = pagination.totalPages || 1;
        }
      }

      if (isLoadMore) {
        setShops(prev => [...prev, ...fetchedShops]);
      } else {
        setShops(fetchedShops);
      }

      setHasMore(pageNum < totalPages);
    } catch (error) {
      console.error('❌ Fetch shops error:', error);
      if (!isLoadMore) {
        setShops([]);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [merchantId]);

  // 初期表示：モーダルが開いたときに事業者に紐づく店舗を10件取得
  useEffect(() => {
    if (isOpen) {
      setShops([]);
      setPage(1);
      setHasMore(true);
      setCurrentSearch('');
      setSearchQuery('');
      fetchShops('', 1, false);
    }
  }, [isOpen, fetchShops]);

  // 検索実行
  const handleSearch = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    setCurrentSearch(searchQuery);
    await fetchShops(searchQuery, 1, false);
  }, [searchQuery, fetchShops]);

  // 追加読み込み
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchShops(currentSearch, nextPage, true);
  }, [isLoadingMore, hasMore, page, currentSearch, fetchShops]);

  // スクロールイベント監視
  const handleScroll = useCallback(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const { scrollTop, scrollHeight, clientHeight } = listElement;
    // 末端から50px以内に達したら追加読み込み
    if (scrollHeight - scrollTop - clientHeight < 50) {
      loadMore();
    }
  }, [loadMore]);

  const handleSelect = useCallback((shop: Shop) => {
    onSelect(shop);
    setSearchQuery('');
    setShops([]);
    setPage(1);
    setHasMore(true);
    setCurrentSearch('');
    onClose();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setShops([]);
    setPage(1);
    setHasMore(true);
    setCurrentSearch('');
    onClose();
  }, [onClose]);

  // Enterキーで検索
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ（透明） */}
      <div 
        className="fixed inset-0"
        onClick={handleClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-300 max-w-2xl w-full max-h-[80vh] flex flex-col animate-fadeIn">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 bg-green-600 rounded-t-lg">
          <h2 className="text-lg font-semibold text-white">店舗選択</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-green-100 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索ボックス */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="店舗名で検索..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="検索"
            >
              {isLoading ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 店舗リスト */}
        <div 
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6"
        >
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>読み込み中...</p>
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>店舗が見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => handleSelect(shop)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedShopId === shop.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{shop.name}</div>
                      {shop.merchant && (
                        <div className="text-sm text-gray-500 mt-1">事業者: {shop.merchant.name}</div>
                      )}
                    </div>
                    {selectedShopId === shop.id && (
                      <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
              {/* 追加読み込み中のインジケーター */}
              {isLoadingMore && (
                <div className="text-center py-4 text-gray-500">
                  <svg className="mx-auto h-6 w-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border-2 border-green-600 text-green-600 text-sm rounded-md hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ShopSelectModal);
