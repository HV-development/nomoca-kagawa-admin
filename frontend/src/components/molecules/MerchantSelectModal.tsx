'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/components/contexts/auth-context';

interface Merchant {
  id: string;
  name: string;
  account: {
    email: string;
  };
}

interface MerchantSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (merchant: Merchant) => void;
  selectedMerchantId?: string;
}

const ITEMS_PER_PAGE = 10;

function MerchantSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedMerchantId,
}: MerchantSelectModalProps) {
  const auth = useAuth();
  const isAdmin = auth?.user?.accountType === 'admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentSearch, setCurrentSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  // データ取得関数
  const fetchMerchants = useCallback(async (searchTerm: string, pageNum: number, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await apiClient.getMerchants({
        search: searchTerm || undefined,
        page: pageNum,
        limit: ITEMS_PER_PAGE,
      });

      let fetchedMerchants: Merchant[] = [];
      let totalPages = 1;

      if (response && typeof response === 'object') {
        // data ラッパーがある場合（formatSuccessResponse形式）
        if ('data' in response && response.data && typeof response.data === 'object') {
          const dataObj = response.data as { merchants?: Merchant[]; pagination?: { totalPages?: number } };
          if ('merchants' in dataObj) {
            fetchedMerchants = dataObj.merchants || [];
          }
          // pagination情報をdataから取得
          if ('pagination' in dataObj && dataObj.pagination && typeof dataObj.pagination === 'object') {
            totalPages = dataObj.pagination.totalPages || 1;
          }
        } else if ('merchants' in response) {
          // dataラッパーがない場合
          fetchedMerchants = (response as { merchants: Merchant[] }).merchants || [];
          // pagination情報を取得
          if ('pagination' in response && response.pagination && typeof response.pagination === 'object') {
            const pagination = response.pagination as { totalPages?: number };
            totalPages = pagination.totalPages || 1;
          }
        } else if (Array.isArray(response)) {
          fetchedMerchants = response as Merchant[];
        }
      }

      if (isLoadMore) {
        setMerchants(prev => [...prev, ...fetchedMerchants]);
      } else {
        setMerchants(fetchedMerchants);
      }

      setHasMore(pageNum < totalPages);
    } catch (error) {
      console.error('❌ Fetch merchants error:', error);
      if (!isLoadMore) {
        setMerchants([]);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // 初期表示：モーダルが開いたときに10件取得（adminアカウントのみ）
  useEffect(() => {
    if (isOpen) {
      setMerchants([]);
      pageRef.current = 1;
      setHasMore(true);
      setCurrentSearch('');
      setSearchQuery('');
      // adminアカウントの場合のみ初期表示で全事業者一覧を取得
      if (isAdmin) {
        fetchMerchants('', 1, false);
      }
    }
  }, [isOpen, isAdmin, fetchMerchants]);

  // 検索実行
  const handleSearch = useCallback(async () => {
    pageRef.current = 1;
    setHasMore(true);
    setCurrentSearch(searchQuery);
    await fetchMerchants(searchQuery, 1, false);
  }, [searchQuery, fetchMerchants]);

  // 追加読み込み
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    await fetchMerchants(currentSearch, nextPage, true);
  }, [isLoadingMore, hasMore, currentSearch, fetchMerchants]);

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

  const handleSelect = useCallback((merchant: Merchant) => {
    onSelect(merchant);
    setSearchQuery('');
    setMerchants([]);
    pageRef.current = 1;
    setHasMore(true);
    setCurrentSearch('');
    onClose();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setMerchants([]);
    pageRef.current = 1;
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
          <h2 className="text-lg font-semibold text-white">事業者選択</h2>
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
              placeholder="事業者名またはメールアドレスで検索..."
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

        {/* 事業者リスト */}
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
          ) : merchants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>{currentSearch ? '事業者が見つかりませんでした' : '事業者名またはメールアドレスで検索してください'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {merchants.map((merchant) => (
                <button
                  key={merchant.id}
                  onClick={() => handleSelect(merchant)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedMerchantId === merchant.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{merchant.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{merchant.account?.email}</div>
                    </div>
                    {selectedMerchantId === merchant.id && (
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

export default React.memo(MerchantSelectModal);
