'use client';

import React from 'react';
import Button from '@/components/atoms/Button';

interface AccountIssueConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  existingAccountCount: number;
  isExecuting?: boolean;
}

export default function AccountIssueConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  existingAccountCount,
  isExecuting = false
}: AccountIssueConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
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
            
            <p className="text-sm text-gray-500 mt-4">
              この操作は取り消すことができません。
            </p>
            
            {/* 警告メッセージ */}
            {existingAccountCount > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      アカウント発行済みの事業者が<span className="font-medium">{existingAccountCount}件</span>含まれています。
                    </p>
                    <p className="text-sm text-yellow-800 mt-1">
                      発行済みの事業者にはパスワード設定メールは送信されません。
                    </p>
                  </div>
                </div>
              </div>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  発行中...
                </>
              ) : (
                'アカウント発行'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
