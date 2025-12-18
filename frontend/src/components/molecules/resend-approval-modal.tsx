'use client';

import React from 'react';
import Button from '@/components/atoms/Button';

interface ResendApprovalModalProps {
  isOpen: boolean;
  merchantName: string;
  email: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function ResendApprovalModal({
  isOpen,
  merchantName,
  email,
  onClose,
  onConfirm,
  isLoading = false,
}: ResendApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* ヘッダー */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              承認メール再送確認
            </h3>
          </div>

          {/* コンテンツ */}
          <div className="mb-6 space-y-3">
            <p className="text-sm text-gray-700">
              以下の事業者に承認メールを再送しますか？
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-xs text-gray-500">事業者名</span>
                <p className="text-sm font-medium text-gray-900">{merchantName}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">メールアドレス</span>
                <p className="text-sm font-medium text-gray-900">{email}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              ※ 承認メールには24時間有効な承認リンクが含まれます
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? '送信中...' : '再送'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

