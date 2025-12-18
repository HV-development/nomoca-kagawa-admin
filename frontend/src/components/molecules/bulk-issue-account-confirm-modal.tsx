'use client';

import React from 'react';
import Button from '@/components/atoms/Button';

interface BulkIssueAccountConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  alreadyIssuedCount: number;
  isIssuing?: boolean;
}

export default function BulkIssueAccountConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  alreadyIssuedCount,
  isIssuing = false
}: BulkIssueAccountConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 pointer-events-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              アカウント発行
            </h3>
          </div>

          {/* メッセージ */}
          <div className="mb-8 text-center">
            <p className="text-gray-700">
              <span className="font-medium">{selectedCount}件</span>の事業者にアカウントを発行します。
            </p>
            {alreadyIssuedCount > 0 && (
              <p className="text-yellow-600 mt-2 font-medium">
                発行済みアカウントが<span className="font-medium">{alreadyIssuedCount}件</span>含まれています。これらのアカウントはスキップされます。
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              この操作は取り消すことができません。
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              disabled={isIssuing}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm border border-green-600 bg-white text-green-600 hover:bg-green-50 focus:ring-green-500"
            >
              キャンセル
            </button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isIssuing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isIssuing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  発行中...
                </>
              ) : (
                '発行する'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



