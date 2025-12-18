'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/atoms/Button';
import ToastContainer from '@/components/molecules/toast-container';
import AdminLayout from '@/components/templates/admin-layout';

// Merchant型定義
interface Merchant {
  id: string;
  name: string;
  nameKana: string;
  representativeNameLast: string;
  representativeNameFirst: string;
  representativeNameLastKana: string;
  representativeNameFirstKana: string;
  representativePhone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string | null;
  accountEmail: string;
  account?: {
    email: string;
    status: string;
    displayName: string | null;
    lastLoginAt: string | null;
    passwordHash?: string | null;
  };
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface MerchantDetailViewProps {
  merchant: Merchant | null;
  isLoading: boolean;
  error: string | null;
  isOperatorRole: boolean;
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

export default function MerchantDetailView({
  merchant,
  isLoading,
  error,
  isOperatorRole,
  toasts,
  onRemoveToast,
}: MerchantDetailViewProps) {
  const getAccountStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '発行済み';
      case 'inactive': return '未発行';
      case 'pending': return '承認待ち';
      case 'suspended': return '停止中';
      default: return status;
    }
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-yellow-600';
      case 'pending': return 'text-orange-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">事業者情報</h1>
          <p className="text-gray-600 mt-1">事業者の詳細情報を確認できます</p>
        </div>

        {/* ローディング状態 */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        )}

        {/* エラー状態 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 事業者情報 */}
        {!isLoading && !error && merchant && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 space-y-6">
              {/* 基本情報 */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/2">事業者名</td>
                      <td className="py-3 px-4 text-gray-900">{merchant.name}</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">事業者名（カナ）</td>
                      <td className="py-3 px-4 text-gray-900">{merchant.nameKana}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 代表者情報 */}
              {!isOperatorRole && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">代表者情報</h2>
                  <table className="w-full border-collapse border border-gray-300">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">代表者名</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.representativeNameLast} {merchant.representativeNameFirst}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">代表者名（カナ）</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.representativeNameLastKana} {merchant.representativeNameFirstKana}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">電話番号</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.representativePhone}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 住所情報 */}
              {!isOperatorRole && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">住所情報</h2>
                  <table className="w-full border-collapse border border-gray-300">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">郵便番号</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.postalCode}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">都道府県</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.prefecture}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">市区町村</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.city}</td>
                      </tr>
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">番地</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.address1}</td>
                      </tr>
                      {merchant.address2 && (
                        <tr className="border-b border-gray-300">
                          <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">建物名・部屋番号</td>
                          <td className="py-3 px-4 text-gray-900">{merchant.address2}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* アカウント情報 */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    {!isOperatorRole && (
                      <tr className="border-b border-gray-300">
                        <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">メールアドレス</td>
                        <td className="py-3 px-4 text-gray-900">{merchant.account?.email || merchant.accountEmail}</td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-300">
                      <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">アカウントステータス</td>
                      <td className={`py-3 px-4 text-sm font-medium ${getAccountStatusColor(merchant.account?.status || 'inactive')}`}>
                        {getAccountStatusLabel(merchant.account?.status || 'inactive')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ボタンエリア */}
        {!isLoading && !error && merchant && (
          <div className="flex justify-center gap-4">
            <Link href={`/merchants/${merchant.id}/shops`}>
              <Button variant="outline-green">
                店舗一覧を見る
              </Button>
            </Link>
            <Link href={`/merchants/${merchant.id}/edit-account`}>
              <Button variant="primary">
                アカウント情報編集
              </Button>
            </Link>
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={onRemoveToast} />
    </AdminLayout>
  );
}

