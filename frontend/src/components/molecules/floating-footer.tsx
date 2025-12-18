'use client';

import React from 'react';
import Button from '@/components/atoms/Button';

interface FloatingFooterProps {
  selectedCount: number;
  onBulkUpdateStatus?: (status: string) => void;
  isUpdating?: boolean;
  onDownloadCSV?: () => void;
}

export default function FloatingFooter({
  selectedCount,
  onBulkUpdateStatus,
  isUpdating = false,
  onDownloadCSV
}: FloatingFooterProps) {
  const [pendingStatus, setPendingStatus] = React.useState('');

  if (selectedCount === 0) {
    return null;
  }

  const handleStatusChange = () => {
    if (pendingStatus && onBulkUpdateStatus) {
      onBulkUpdateStatus(pendingStatus);
      setPendingStatus(''); // 更新後にリセット
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registering':
        return 'text-gray-700';
      case 'collection_requested':
        return 'text-yellow-700';
      case 'approval_pending':
        return 'text-orange-700';
      case 'promotional_materials_preparing':
        return 'text-blue-700';
      case 'promotional_materials_shipping':
        return 'text-indigo-700';
      case 'operating':
        return 'text-green-700';
      case 'suspended':
        return 'text-red-700';
      case 'terminated':
        return 'text-gray-500';
      default:
        return 'text-gray-700';
    }
  };

  return (
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

          <div className="flex items-center space-x-2">
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              disabled={isUpdating}
              className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 ${getStatusColor(pendingStatus)}`}
            >
              <option value="" className="text-gray-700">ステータスを選択</option>
              <option value="registering" className="text-blue-600">登録中</option>
              <option value="collection_requested" className="text-purple-600">情報収集依頼済み</option>
              <option value="approval_pending" className="text-yellow-600">承認待ち</option>
              <option value="promotional_materials_preparing" className="text-orange-600">宣材準備中</option>
              <option value="promotional_materials_shipping" className="text-indigo-600">宣材発送中</option>
              <option value="operating" className="text-green-600">営業中</option>
              <option value="suspended" className="text-red-600">停止中</option>
              <option value="terminated" className="text-gray-600">終了</option>
            </select>
            <Button
              onClick={handleStatusChange}
              disabled={isUpdating || !pendingStatus}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              更新
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
