'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Pagination from '@/components/molecules/Pagination';
import AdminSearchForm from '@/components/organisms/AdminSearchForm';
import AdminTable from '@/components/organisms/AdminTable';
import { type Admin, type AdminSearchForm as AdminSearchFormData } from '@hv-development/schemas';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import ToastContainer from '@/components/molecules/toast-container';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default function AdminsPage() {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URLパラメータまたはsessionStorageからトーストメッセージを表示（重複防止）
  const toastShownRef = useRef(false);
  useEffect(() => {
    if (toastShownRef.current) return;
    
    // URLパラメータからトースト
    const toastParam = searchParams?.get('toast');
    if (toastParam) {
      toastShownRef.current = true;
      showSuccess(decodeURIComponent(toastParam));
      const url = new URL(window.location.href);
      url.searchParams.delete('toast');
      router.replace(url.pathname + url.search, { scroll: false });
      return;
    }
    
    // sessionStorageからトースト
    const storedToast = sessionStorage.getItem('adminToast');
    if (storedToast) {
      toastShownRef.current = true;
      showSuccess(storedToast);
      sessionStorage.removeItem('adminToast');
    }
  }, [searchParams, showSuccess, router]);
  
  const [searchForm, setSearchForm] = useState<AdminSearchFormData>({
    accountId: '',
    name: '',
    email: '',
    role: '',
  });
  const lastFetchKeyRef = useRef<string | null>(null);
  const [appliedSearchForm, setAppliedSearchForm] = useState<AdminSearchFormData>({
    accountId: '',
    name: '',
    email: '',
    role: '',
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // データ取得
  const fetchAdmins = useCallback(async (searchParams?: AdminSearchFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getAdminAccounts({
        ...searchParams,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      const responseData = response as { 
        accounts?: Admin[]; 
        pagination?: { page: number; limit: number; total: number; pages: number } 
      };
      
      const adminData = responseData.accounts || [];
      const paginationData = responseData.pagination || { page: 1, limit: 10, total: 0, pages: 0 };
      
      setAdmins(adminData);
      setPagination(paginationData);
    } catch (err) {
      console.error('管理者データの取得に失敗しました:', err);
      setError('管理者データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  // データ取得（検索条件変更またはページ変更の場合に実行）
  useEffect(() => {
    const key = JSON.stringify({
      search: appliedSearchForm,
      page: pagination.page,
      limit: pagination.limit,
    });

    if (lastFetchKeyRef.current === key) {
      return;
    }

    lastFetchKeyRef.current = key;

    fetchAdmins(appliedSearchForm);
  }, [appliedSearchForm, pagination.page, pagination.limit, fetchAdmins]);

  // ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    if (isLoading) return;
    setPagination(prev => ({ ...prev, page }));
  }, [isLoading]);

  const handleInputChange = useCallback((field: keyof AdminSearchFormData, value: string) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSearch = useCallback(() => {
    // 検索フォームの内容を適用済み検索フォームにコピーして検索実行
    setAppliedSearchForm({ ...searchForm });
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchForm]);

  const handleClear = useCallback(() => {
    setSearchForm({
      accountId: '',
      name: '',
      email: '',
      role: '',
    });
    setAppliedSearchForm({
      accountId: '',
      name: '',
      email: '',
      role: '',
    });
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsSearchExpanded(prev => !prev);
  }, []);

  const handleDelete = useCallback(async (adminId: string, adminEmail: string) => {
    if (!adminId) return;
    if (!confirm(`${adminEmail}のアカウントを削除しますか？`)) return;
    try {
      await apiClient.deleteAdminAccount(adminId);
      // 手動で再取得
      fetchAdmins(appliedSearchForm);
      showSuccess('管理者アカウントを削除しました');
    } catch (error: unknown) {
      console.error('管理者アカウントの削除に失敗しました:', error);
      showError('管理者アカウントの削除に失敗しました。もう一度お試しください。');
    }
  }, [appliedSearchForm, fetchAdmins, showSuccess, showError]);

  // エラー状態
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon name="admin" size="lg" className="mx-auto text-red-400 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchAdmins()}>
              再試行
            </Button>
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
            <h1 className="text-2xl font-bold text-gray-900">管理者アカウント</h1>
            <p className="text-gray-600">
              管理者アカウントの管理・編集を行います
            </p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Icon name="admin" size="sm" className="text-gray-600" />
                <span className="font-medium text-gray-900">管理者太郎</span>
              </div>
            </div>
          </div>
        </div>

        {/* 検索フォーム */}
        <AdminSearchForm
          searchForm={searchForm}
          isSearchExpanded={isSearchExpanded}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onToggleExpand={handleToggleExpand}
        />

        {/* ページネーション */}
        {pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
            disabled={isLoading}
          />
        )}

        {/* アカウント一覧 */}
        <AdminTable
          admins={admins}
          isLoading={isLoading}
          pagination={pagination}
          onDelete={handleDelete}
        />
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
