'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { type Admin } from '@hv-development/schemas';

interface AdminTableProps {
  admins: Admin[];
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onDelete: (adminId: string, adminEmail: string) => void;
}

export default function AdminTable({
  admins,
  isLoading,
  pagination,
  onDelete,
}: AdminTableProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sysadmin':
        return '管理者';
      case 'operator':
        return '一般';
      default:
        return '一般';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          アカウント一覧 ({pagination.total}件)
        </h3>
        <Link href="/admins/new">
          <Button variant="outline" className="bg-white text-green-600 border-green-600 hover:bg-green-50">
            <span className="mr-2">+</span>
            新規登録
          </Button>
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        {/* ローディング状態 - テーブル内のみ */}
        {isLoading && admins.length > 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">読み込み中...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  権限
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin, index) => (
                <tr key={admin.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="flex items-center gap-2">
                      <Link href={`/admins/${admin.id}/edit`}>
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
                      <button 
                        onClick={() => onDelete(admin.id, admin.email)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] group"
                        title="削除"
                      >
                        <Image 
                          src="/dustbox.png" 
                          alt="削除" 
                          width={24}
                          height={24}
                          className="w-6 h-6 flex-shrink-0 object-contain"
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{admin.lastName} {admin.firstName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{admin.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getRoleLabel(String(admin.role ?? ''))}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isLoading && admins.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">データを読み込み中...</p>
        </div>
      )}

      {!isLoading && admins.length === 0 && (
        <div className="text-center py-12">
          <Icon name="admin" size="lg" className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">管理者アカウントが見つかりません</h3>
          <p className="text-gray-500">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  );
}

