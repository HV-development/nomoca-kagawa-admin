'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { statusOptions } from '@/lib/constants/shop';

interface ShopFloatingFooterProps {
  selectedCount: number;
  onStatusChange: (status: string) => void;
  onExecute: () => void;
  selectedStatus: string;
  isExecuting?: boolean;
}

export default function ShopFloatingFooter({
  selectedCount,
  onStatusChange,
  onExecute,
  selectedStatus,
  isExecuting = false
}: ShopFloatingFooterProps) {
  // ステータスカラー関数（店舗ステータス用）
  const _getStatusColor = (status: string) => {
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

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center space-x-12">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount}件選択中
          </span>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                ステータス変更:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className={`text-sm font-medium rounded-lg px-3 py-2 border border-gray-300 bg-white focus:ring-2 focus:ring-green-500 min-w-[200px] ${_getStatusColor(selectedStatus)}`}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={onExecute}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2"
            >
              {isExecuting ? (
                <>
                  <Icon name="info" size="sm" className="animate-spin" />
                  <span>実行中...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size="sm" />
                  <span>実行</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

