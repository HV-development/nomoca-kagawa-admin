'use client';

import React from 'react';
import Button from '@/components/atoms/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isExecuting?: boolean;
  variant?: 'default' | 'danger';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  isExecuting = false,
  variant = 'default',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      {/* モーダル */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 relative z-10">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>

          {/* メッセージ */}
          <div className="mb-6 text-center">
            <p className="text-gray-700">{message}</p>
          </div>

          {/* ボタン */}
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline-green"
              onClick={onClose}
              disabled={isExecuting}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'secondary' : 'primary'}
              onClick={onConfirm}
              disabled={isExecuting}
              className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  処理中...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

