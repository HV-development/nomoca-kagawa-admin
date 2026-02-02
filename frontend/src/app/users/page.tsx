'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '@/components/templates/admin-layout';
import Icon from '@/components/atoms/Icon';
import Pagination from '@/components/molecules/Pagination';
import UserSearchForm, { type UserSearchFormData } from '@/components/organisms/UserSearchForm';
import UserTable from '@/components/organisms/UserTable';
import { useAuth } from '@/components/contexts/auth-context';
import ToastContainer from '@/components/molecules/toast-container';
import { convertUsersToCSV, downloadCSV, generateFilename, type UserForCSV } from '@/utils/csvExport';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

interface User {
  id: string;
  nickname: string;
  email: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  birthDate: string;
  gender: number;
  saitamaAppId: string;
  rank: number;
  registeredStore: string;
  registeredAt: string;
  accountStatus: string;
}

export default function UsersPage() {
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const lastFetchKeyRef = useRef<string | null>(null);

  // operatorロールかどうかを判定
  const isOperatorRole = auth?.user?.accountType === 'admin' && auth?.user?.role === 'operator';

  const [searchForm, setSearchForm] = useState<UserSearchFormData>({
    nickname: '',
    email: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address: '',
    birthDate: '',
    gender: '',
    saitamaAppId: '',
    ranks: [],
    registeredDateStart: '',
    registeredDateEnd: '',
    accountStatus: '',
  });
  const [appliedSearchForm, setAppliedSearchForm] = useState<UserSearchFormData>({
    nickname: '',
    email: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address: '',
    birthDate: '',
    gender: '',
    saitamaAppId: '',
    ranks: [],
    registeredDateStart: '',
    registeredDateEnd: '',
    accountStatus: '',
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // データ取得
  const fetchUsers = useCallback(async (searchParams?: UserSearchFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // セキュリティ改善：個人情報をクエリパラメータで送信しないため、POSTメソッドでボディに含めて送信
      const searchBody: Record<string, string | number> = {};

      // 検索条件をボディに追加
      if (searchParams?.nickname) searchBody.nickname = searchParams.nickname;

      // operatorロールでない場合のみ機密情報での検索パラメータを追加
      if (!isOperatorRole) {
        if (searchParams?.email) searchBody.email = searchParams.email;
        if (searchParams?.postalCode) searchBody.postalCode = searchParams.postalCode;
        if (searchParams?.prefecture) searchBody.prefecture = searchParams.prefecture;
        if (searchParams?.city) searchBody.city = searchParams.city;
        if (searchParams?.address) searchBody.address = searchParams.address;
        if (searchParams?.birthDate) searchBody.birthDate = searchParams.birthDate;
        if (searchParams?.gender) searchBody.gender = searchParams.gender;
        if (searchParams?.saitamaAppId) searchBody.saitamaAppId = searchParams.saitamaAppId;
      }

      if (searchParams?.ranks && searchParams.ranks.length > 0) {
        searchBody.ranks = JSON.stringify(searchParams.ranks);
      }
      if (searchParams?.registeredDateStart) searchBody.registeredDateStart = searchParams.registeredDateStart;
      if (searchParams?.registeredDateEnd) searchBody.registeredDateEnd = searchParams.registeredDateEnd;
      if (searchParams?.accountStatus) searchBody.accountStatus = searchParams.accountStatus;

      // ページネーションパラメータを追加
      searchBody.page = pagination.page;
      searchBody.limit = pagination.limit;

      const data = await apiClient.getUsers(searchBody) as { users: User[]; total: number; page: number; limit: number };
      // APIレスポンスをフォーマット
      const responseData = data as {
        users: Array<{
          id: string;
          nickname: string;
          email?: string;
          postalCode?: string;
          prefecture?: string;
          city?: string;
          address?: string;
          birthDate?: string;
          gender?: string | number;
          saitamaAppId?: string;
          rank: number;
          registeredStore?: string;
          registeredAt: string;
          accountStatus?: string;
        }>;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };

      // ページネーション情報を更新（pageとlimitは維持、totalとpagesのみ更新で無限ループ防止）
      if (responseData.pagination) {
        setPagination(prev => ({
          ...prev,
          total: responseData.pagination?.total ?? prev.total,
          pages: responseData.pagination?.totalPages ?? prev.pages,
        }));
      }

      // operatorロールの場合は機密情報を含めない
      const formattedUsers: User[] = responseData.users.map((user) => {
        const base: User = {
          id: user.id,
          nickname: user.nickname,
          email: '',
          postalCode: '',
          prefecture: '',
          city: '',
          address: '',
          birthDate: '',
          gender: 0,
          saitamaAppId: '',
          rank: user.rank,
          registeredStore: '',
          registeredAt: user.registeredAt || '',
          accountStatus: user.accountStatus || 'active',
        };

        // operatorロールでない場合のみ機密情報を設定
        if (!isOperatorRole) {
          return {
            ...base,
            email: user.email ?? '',
            postalCode: user.postalCode ?? '',
            prefecture: user.prefecture ?? '',
            city: user.city ?? '',
            address: user.address ?? '',
            birthDate: user.birthDate ? user.birthDate.replace(/-/g, '/') : '',
            gender: typeof user.gender === 'string' ? (user.gender === 'male' ? 1 : user.gender === 'female' ? 2 : 3) : (user.gender || 0),
            saitamaAppId: user.saitamaAppId ?? '',
            registeredStore: user.registeredStore ?? '',
          };
        }

        // operatorロールの場合は機密情報を含めない
        return base;
      });

      setUsers(formattedUsers);
    } catch (err) {
      console.error('ユーザー一覧の取得に失敗しました:', err);
      setError('ユーザー一覧の取得に失敗しました');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOperatorRole, pagination.page, pagination.limit]);

  // データ取得（初回読み込み・検索）
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
      search: appliedSearchForm,
      isOperatorRole,
      page: pagination.page,
      limit: pagination.limit,
    });

    if (lastFetchKeyRef.current === key) {
      return;
    }

    lastFetchKeyRef.current = key;

    fetchUsers(appliedSearchForm);
  }, [auth?.isLoading, auth?.user, appliedSearchForm, fetchUsers, isOperatorRole, pagination.page, pagination.limit]);

  // バックエンドでフィルタリングされるため、フロントエンドでのフィルタリングは不要
  const filteredUsers = users;

  const handleInputChange = useCallback((field: keyof UserSearchFormData, value: string) => {
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
    // キャッシュをリセットして強制的に再フェッチ
    lastFetchKeyRef.current = null;
  }, [searchForm]);

  const handleClear = useCallback(() => {
    const emptyForm: UserSearchFormData = {
      nickname: '',
      email: '',
      postalCode: '',
      prefecture: '',
      city: '',
      address: '',
      birthDate: '',
      gender: '',
      saitamaAppId: '',
      ranks: [],
      registeredDateStart: '',
      registeredDateEnd: '',
      accountStatus: '',
    };
    setSearchForm(emptyForm);
    setAppliedSearchForm(emptyForm);
    // ページを1にリセット
    setPagination(prev => ({ ...prev, page: 1 }));
    // キャッシュをリセットして強制的に再フェッチ
    lastFetchKeyRef.current = null;
  }, []);

  // ページ変更ハンドラー
  const handlePageChange = useCallback((page: number) => {
    if (isLoading) return;
    setPagination(prev => ({ ...prev, page }));
  }, [isLoading]);

  // 全データ取得関数（ページネーション対応、検索条件適用）
  const fetchAllUsers = async (): Promise<User[]> => {
    const allUsers: User[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const searchBody: Record<string, unknown> = {};

        if (appliedSearchForm.nickname) searchBody.nickname = appliedSearchForm.nickname;

        if (!isOperatorRole) {
          if (appliedSearchForm.email) searchBody.email = appliedSearchForm.email;
          if (appliedSearchForm.postalCode) searchBody.postalCode = appliedSearchForm.postalCode;
          if (appliedSearchForm.prefecture) searchBody.prefecture = appliedSearchForm.prefecture;
          if (appliedSearchForm.city) searchBody.city = appliedSearchForm.city;
          if (appliedSearchForm.address) searchBody.address = appliedSearchForm.address;
          if (appliedSearchForm.birthDate) searchBody.birthDate = appliedSearchForm.birthDate;
          if (appliedSearchForm.gender) searchBody.gender = appliedSearchForm.gender;
          if (appliedSearchForm.saitamaAppId) searchBody.saitamaAppId = appliedSearchForm.saitamaAppId;
        }

        if (appliedSearchForm.ranks && appliedSearchForm.ranks.length > 0) {
          searchBody.ranks = JSON.stringify(appliedSearchForm.ranks);
        }
        if (appliedSearchForm.registeredDateStart) searchBody.registeredDateStart = appliedSearchForm.registeredDateStart;
        if (appliedSearchForm.registeredDateEnd) searchBody.registeredDateEnd = appliedSearchForm.registeredDateEnd;
        if (appliedSearchForm.accountStatus) searchBody.accountStatus = appliedSearchForm.accountStatus;

        searchBody.page = page;
        searchBody.limit = limit;

        const data = await apiClient.getUsers(searchBody) as {
          users?: Array<{
            id: string;
            nickname: string;
            email?: string;
            postalCode?: string;
            prefecture?: string;
            city?: string;
            address?: string;
            birthDate?: string;
            gender?: string | number;
            saitamaAppId?: string;
            rank: number;
            registeredStore?: string;
            registeredAt: string;
            accountStatus?: string;
          }>;
          pagination?: {
            totalPages?: number;
            total?: number;
            page?: number;
            limit?: number;
          };
        };
        let usersArray: User[] = [];
        let paginationInfo: { totalPages?: number; total?: number } = {};

        if (!data) {
          throw new Error('APIレスポンスが空です');
        }

        if (Array.isArray(data)) {
          usersArray = data;
          hasMore = false;
        } else if (data && typeof data === 'object') {
          if ('users' in data) {
            if (!Array.isArray(data.users)) {
              throw new Error('APIレスポンスのusersが配列ではありません');
            }
            // APIレスポンスをフォーマット
            usersArray = (data.users || []).map((user) => {
              const base: User = {
                id: user.id,
                nickname: user.nickname,
                email: '',
                postalCode: '',
                prefecture: '',
                city: '',
                address: '',
                birthDate: '',
                gender: 0,
                saitamaAppId: '',
                rank: user.rank,
                registeredStore: '',
                registeredAt: user.registeredAt || '',
                accountStatus: user.accountStatus || 'active',
              };

              // operatorロールでない場合のみ機密情報を設定
              if (!isOperatorRole) {
                return {
                  ...base,
                  email: user.email ?? '',
                  postalCode: user.postalCode ?? '',
                  prefecture: user.prefecture ?? '',
                  city: user.city ?? '',
                  address: user.address ?? '',
                  birthDate: user.birthDate ? user.birthDate.replace(/-/g, '/') : '',
                  gender: typeof user.gender === 'string' ? (user.gender === 'male' ? 1 : user.gender === 'female' ? 2 : 3) : (user.gender || 0),
                  saitamaAppId: user.saitamaAppId ?? '',
                  registeredStore: user.registeredStore ?? '',
                };
              }

              // operatorロールの場合は機密情報を含めない
              return base;
            });
            paginationInfo = data.pagination || {};
          } else {
            throw new Error('APIレスポンスにusersプロパティがありません');
          }
        } else {
          throw new Error('APIレスポンスの形式が不正です');
        }

        allUsers.push(...usersArray);

        const totalPages = paginationInfo.totalPages || 1;
        hasMore = page < totalPages;
        page++;

        if (usersArray.length === 0) {
          hasMore = false;
        }
      } catch (err) {
        console.error('全データ取得中にエラーが発生しました:', err);
        // より詳細なエラーメッセージを生成
        let errorMessage = 'データの取得に失敗しました';
        if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
          // レスポンス情報がある場合は追加
          if ((err as Error & { response?: { status: number; data: unknown } }).response) {
            const response = (err as Error & { response?: { status: number; data: unknown } }).response;
            if (response?.status) {
              errorMessage = `${errorMessage} (HTTP ${response.status})`;
            }
            if (response?.data && typeof response.data === 'object' && 'message' in response.data) {
              errorMessage = `${errorMessage}: ${(response.data as { message: string }).message}`;
            }
          }
        }
        throw new Error(errorMessage);
      }
    }

    // フロントエンドのフィルタリングを適用
    return allUsers.filter((user) => {
      const matchesSearch =
        (appliedSearchForm.nickname === '' || user.nickname.toLowerCase().includes(appliedSearchForm.nickname.toLowerCase())) &&
        (!isOperatorRole || true) &&
        (isOperatorRole || (
          (appliedSearchForm.postalCode === '' || user.postalCode.includes(appliedSearchForm.postalCode)) &&
          (appliedSearchForm.prefecture === '' || user.prefecture.toLowerCase().includes(appliedSearchForm.prefecture.toLowerCase())) &&
          (appliedSearchForm.city === '' || user.city.toLowerCase().includes(appliedSearchForm.city.toLowerCase())) &&
          (appliedSearchForm.address === '' || user.address.toLowerCase().includes(appliedSearchForm.address.toLowerCase())) &&
          (appliedSearchForm.birthDate === '' || user.birthDate === appliedSearchForm.birthDate) &&
          (appliedSearchForm.gender === '' || user.gender.toString() === appliedSearchForm.gender) &&
          (appliedSearchForm.saitamaAppId === '' || user.saitamaAppId.includes(appliedSearchForm.saitamaAppId))
        )) &&
        (appliedSearchForm.ranks.length === 0 || appliedSearchForm.ranks.includes(user.rank));

      let matchesDateRange = true;
      if (appliedSearchForm.registeredDateStart || appliedSearchForm.registeredDateEnd) {
        const userDate = new Date(user.registeredAt);
        if (appliedSearchForm.registeredDateStart) {
          const startDate = new Date(appliedSearchForm.registeredDateStart);
          if (userDate < startDate) matchesDateRange = false;
        }
        if (appliedSearchForm.registeredDateEnd) {
          const endDate = new Date(appliedSearchForm.registeredDateEnd);
          if (userDate > endDate) matchesDateRange = false;
        }
      }

      return matchesSearch && matchesDateRange;
    });
  };

  // 全データをCSVダウンロード
  const handleDownloadAllCSV = useCallback(async () => {
    try {
      setIsDownloadingCSV(true);

      const allUsers = await fetchAllUsers();

      const usersForCSV: UserForCSV[] = allUsers.map((user) => ({
        nickname: user.nickname,
        postalCode: user.postalCode,
        prefecture: user.prefecture,
        city: user.city,
        address: user.address,
        birthDate: user.birthDate,
        gender: user.gender,
        saitamaAppId: user.saitamaAppId,
        accountStatus: user.accountStatus,
        registeredStore: user.registeredStore,
        registeredAt: user.registeredAt,
      }));

      const csvContent = convertUsersToCSV(usersForCSV, isOperatorRole);
      const filename = generateFilename('users');
      downloadCSV(csvContent, filename);

      showSuccess(`${allUsers.length}件のユーザーデータをCSVでダウンロードしました`);
    } catch (err: unknown) {
      console.error('CSVダウンロードに失敗しました:', err);
      let errorMessage = '不明なエラー';
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      showError(`CSVダウンロードに失敗しました: ${errorMessage}`);
    } finally {
      setIsDownloadingCSV(false);
    }
  }, [appliedSearchForm, isOperatorRole, showSuccess, showError]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
              <p className="text-gray-600">
                ユーザーの管理・編集を行います
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

        {/* 検索フォーム */}
        <UserSearchForm
          searchForm={searchForm}
          isSearchExpanded={isSearchExpanded}
          isOperatorRole={isOperatorRole}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onToggleExpand={() => setIsSearchExpanded(!isSearchExpanded)}
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

        {/* ユーザー一覧 */}
        <UserTable
          users={filteredUsers}
          isLoading={isLoading}
          error={error}
          isOperatorRole={isOperatorRole}
          isDownloadingCSV={isDownloadingCSV}
          pagination={pagination}
          onDownloadAllCSV={handleDownloadAllCSV}
        />
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}
