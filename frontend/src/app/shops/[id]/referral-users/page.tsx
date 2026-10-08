'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Pagination from '@/components/molecules/Pagination';
import ToastContainer from '@/components/molecules/toast-container';
import { useAuth } from '@/components/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient, type ShopReferralUser } from '@/lib/api';
import { convertReferralUsersToCSV, downloadCSV, generateFilename } from '@/utils/csvExport';

const PAGE_SIZE = 50;
const CSV_PAGE_SIZE = 1000;
const DEFAULT_BACK_HREF = '/shops';

function toSafeBackHref(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_BACK_HREF;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.includes('\\')) return DEFAULT_BACK_HREF;
    const base = 'http://same-origin.invalid';
    const url = new URL(decoded, base);
    if (url.origin !== base) return DEFAULT_BACK_HREF;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_BACK_HREF;
  }
}

function ShopReferralUsersContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const shopId = params.id as string;
  const isAdminAccount = auth?.user?.accountType === 'admin';
  const displayName = auth?.user?.name ?? '—';

  const backHref = useMemo(() => toSafeBackHref(searchParams?.get('returnTo')), [searchParams]);

  const [shopName, setShopName] = useState('');
  const [users, setUsers] = useState<ShopReferralUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const requestIdRef = useRef(0);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  useEffect(() => {
    if (auth?.isLoading) return;
    if (!isAdminAccount) {
      router.replace('/shops');
    }
  }, [auth?.isLoading, isAdminAccount, router]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getShopReferralUsers(shopId, page, PAGE_SIZE);
      if (requestId !== requestIdRef.current) return;
      setShopName(data.shopName);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      console.error('登録ユーザー一覧の取得に失敗しました:', err);
      setError('登録ユーザー一覧の取得に失敗しました');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [shopId, page]);

  useEffect(() => {
    if (auth?.isLoading || !isAdminAccount) return;
    void fetchUsers();
  }, [auth?.isLoading, isAdminAccount, fetchUsers]);

  const handleDownloadCSV = useCallback(async () => {
    try {
      setIsDownloadingCSV(true);
      const first = await apiClient.getShopReferralUsers(shopId, 1, CSV_PAGE_SIZE);
      const usersById = new Map(first.users.map((u) => [u.userId, u]));
      const pages = Math.ceil(first.total / CSV_PAGE_SIZE);
      for (let p = 2; p <= pages; p++) {
        const next = await apiClient.getShopReferralUsers(shopId, p, CSV_PAGE_SIZE);
        next.users.forEach((u) => usersById.set(u.userId, u));
      }
      const allUsers = [...usersById.values()];
      downloadCSV(convertReferralUsersToCSV(first.shopName, allUsers), generateFilename('shop_referral_users'));
      if (allUsers.length !== first.total) {
        showError(`取得中に登録ユーザーが増減したため、件数が一致しません（CSV ${allUsers.length}件 / 取得開始時 ${first.total}件）。もう一度ダウンロードしてください`);
      } else {
        showSuccess(`${allUsers.length}件の登録ユーザーをCSVでダウンロードしました`);
      }
    } catch (err: unknown) {
      console.error('CSVダウンロードに失敗しました:', err);
      showError('CSVダウンロードに失敗しました');
    } finally {
      setIsDownloadingCSV(false);
    }
  }, [shopId, showSuccess, showError]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (auth?.isLoading || !isAdminAccount) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">登録ユーザー一覧</h1>
              <p className="text-gray-600">店舗QRコードから登録したユーザーを表示します</p>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{displayName}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">店舗:</span>
              <span className="text-sm text-gray-900">{shopName || '-'}</span>
            </div>
            <Link href={backHref}>
              <Button variant="outline" className="cursor-pointer bg-white">店舗一覧に戻る</Button>
            </Link>
          </div>
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} disabled={isLoading} />
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          )}

          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">登録ユーザー ({total}件)</h3>
            <Button
              variant="outline"
              onClick={handleDownloadCSV}
              disabled={isDownloadingCSV || total === 0}
              className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              {isDownloadingCSV ? 'ダウンロード中...' : 'CSVダウンロード'}
            </Button>
          </div>

          {error ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-red-600">{error}</p>
              <Button variant="primary" onClick={() => void fetchUsers()}>
                再読み込み
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">顧客ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">登録日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">登録プラン</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{user.customerId || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.registeredAt.replace(/-/g, '/')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.planName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && users.length === 0 && (
                <p className="text-center py-12 text-gray-500">この店舗の店舗QRコードから登録したユーザーはいません。</p>
              )}
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </AdminLayout>
  );
}

export default function ShopReferralUsersPage() {
  return (
    <Suspense fallback={null}>
      <ShopReferralUsersContent />
    </Suspense>
  );
}
