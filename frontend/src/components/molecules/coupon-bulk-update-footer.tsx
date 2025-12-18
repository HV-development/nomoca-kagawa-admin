'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Button from '@/components/atoms/Button';

// 動的インポート：確認時のみ表示されるモーダル
const BulkUpdateConfirmModal = dynamic(() => import('@/components/molecules/bulk-update-confirm-modal'), {
  ssr: false,
});

interface CouponBulkUpdateFooterProps {
  selectedCount: number;
  isAdminAccount: boolean;
  isMerchantAccount: boolean;
  isShopAccount: boolean;
  onBulkUpdateStatus?: (status: string) => void;
  onBulkUpdatePublicStatus?: (isPublic: boolean) => void;
  isUpdating?: boolean;
  unapprovedCount?: number; // 未承認クーポンの件数
  onDownloadCSV?: () => void;
}

export default function CouponBulkUpdateFooter({
  selectedCount,
  isAdminAccount,
  isMerchantAccount,
  isShopAccount,
  onBulkUpdateStatus,
  onBulkUpdatePublicStatus,
  isUpdating = false,
  unapprovedCount = 0,
  onDownloadCSV
}: CouponBulkUpdateFooterProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPublicStatusModal, setShowPublicStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [pendingPublicStatus, setPendingPublicStatus] = useState<string>('');

  if (selectedCount === 0) {
    return null;
  }

  const handleStatusChange = () => {
    if (pendingStatus) {
      setShowStatusModal(true);
    }
  };

  const handlePublicStatusChange = () => {
    if (pendingPublicStatus) {
      setShowPublicStatusModal(true);
    }
  };

  const confirmStatusUpdate = async () => {
    if (pendingStatus && onBulkUpdateStatus) {
      await onBulkUpdateStatus(pendingStatus);
    }
    setShowStatusModal(false);
    setPendingStatus('');
  };

  const confirmPublicStatusUpdate = async () => {
    if (pendingPublicStatus && onBulkUpdatePublicStatus) {
      await onBulkUpdatePublicStatus(pendingPublicStatus === 'true');
    }
    setShowPublicStatusModal(false);
    setPendingPublicStatus('');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '申請中';
      case 'approved':
        return '承認済み';
      case 'suspended':
        return '停止中';
      default:
        return '';
    }
  };

  const getPublicStatusLabel = (isPublic: string) => {
    return isPublic === 'true' ? '公開中' : isPublic === 'false' ? '非公開' : '';
  };

  const getStatusSelectColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700';
      case 'approved':
        return 'text-green-700';
      case 'suspended':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  const getPublicStatusSelectColor = (isPublic: string) => {
    if (isPublic === 'true') {
      return 'text-blue-700';
    } else if (isPublic === 'false') {
      return 'text-red-700';
    }
    return 'text-gray-700';
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-6">
            <span className="text-sm font-medium text-gray-700">
              {selectedCount}件選択中
            </span>

            {onDownloadCSV && (
              <Button
                onClick={onDownloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg"
              >
                CSVダウンロード
              </Button>
            )}

            {isAdminAccount && (
              <div className="flex items-center space-x-2">
                <select
                  value={pendingStatus}
                  onChange={(e) => setPendingStatus(e.target.value)}
                  disabled={isUpdating}
                  className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 ${getStatusSelectColor(pendingStatus)}`}
                >
                  <option value="" className="text-gray-700">承認ステータスを選択</option>
                  <option value="pending" className="text-yellow-700">申請中</option>
                  <option value="approved" className="text-green-700">承認済み</option>
                  <option value="suspended" className="text-red-700">停止中</option>
                </select>
                <Button
                  onClick={handleStatusChange}
                  disabled={isUpdating || !pendingStatus}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  更新
                </Button>
              </div>
            )}

            {(isAdminAccount || isMerchantAccount || isShopAccount) && (
              <div className="flex items-center space-x-2">
                <select
                  value={pendingPublicStatus}
                  onChange={(e) => setPendingPublicStatus(e.target.value)}
                  disabled={isUpdating}
                  className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 ${getPublicStatusSelectColor(pendingPublicStatus)}`}
                >
                  <option value="" className="text-gray-700">公開ステータスを選択</option>
                  <option value="true" className="text-blue-700">公開中</option>
                  <option value="false" className="text-red-700">非公開</option>
                </select>
                <Button
                  onClick={handlePublicStatusChange}
                  disabled={isUpdating || !pendingPublicStatus}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  更新
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BulkUpdateConfirmModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setPendingStatus('');
        }}
        onConfirm={confirmStatusUpdate}
        selectedCount={selectedCount}
        title="承認ステータスの一括変更"
        message={`選択中の${selectedCount}件のクーポンを「${getStatusLabel(pendingStatus)}」に変更しますか？`}
      />

      <BulkUpdateConfirmModal
        isOpen={showPublicStatusModal}
        onClose={() => {
          setShowPublicStatusModal(false);
          setPendingPublicStatus('');
        }}
        onConfirm={confirmPublicStatusUpdate}
        selectedCount={selectedCount}
        title="公開ステータスの一括変更"
        message={`選択中の${selectedCount}件のクーポンを「${getPublicStatusLabel(pendingPublicStatus)}」に変更しますか？`}
        unapprovedCount={unapprovedCount}
      />
    </>
  );
}

