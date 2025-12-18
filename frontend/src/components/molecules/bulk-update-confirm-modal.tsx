'use client';

import React from 'react';
import Button from '@/components/atoms/Button';
import { statusLabels } from '@/lib/constants/shop';

interface BulkUpdateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  selectedStatus?: string; // オプショナルにして後方互換性を保つ
  title?: string; // カスタムタイトル対応
  message?: string; // カスタムメッセージ対応
  isExecuting?: boolean;
  unapprovedCount?: number; // 未承認クーポンの件数
}

export default function BulkUpdateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  selectedStatus,
  title,
  message,
  isExecuting = false,
  unapprovedCount = 0
}: BulkUpdateConfirmModalProps) {
  if (!isOpen) return null;

  // 既存の店舗管理用のロジック
  const statusLabel = selectedStatus ? (statusLabels[selectedStatus] || selectedStatus) : '';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 pointer-events-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {title || 'ステータス一括更新'}
            </h3>
          </div>

          {/* メッセージ */}
          <div className="mb-8 text-center">
            {message ? (
              <p className="text-gray-700">{message}</p>
            ) : (
              <p className="text-gray-700">
                <span className="font-medium">{selectedCount}件</span>を
                <span className="font-medium text-green-600 mx-1">「{statusLabel}」</span>に更新します。
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              この操作は取り消すことができません。
            </p>
            {unapprovedCount > 0 && (
              <p className="text-sm text-red-600 mt-2 font-medium">
                未承認のクーポンが{unapprovedCount}件含まれています。未承認のクーポンは公開できません。
              </p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-green-600 bg-white text-green-600 hover:bg-green-50 focus:ring-green-500"
            >
              キャンセル
            </button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  更新中...
                </>
              ) : (
                '更新する'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
