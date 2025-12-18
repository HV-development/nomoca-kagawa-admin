'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Button from '@/components/atoms/Button';

// 動的インポート：確認時のみ表示されるモーダル
const BulkIssueAccountConfirmModal = dynamic(() => import('./bulk-issue-account-confirm-modal'), {
  ssr: false,
});

interface FloatingFooterMerchantProps {
  selectedCount: number;
  onConfirmIssue: () => void;
  isIssuingAccount?: boolean;
  alreadyIssuedCount: number;
  onDownloadCSV?: () => void;
}

export default function FloatingFooterMerchant({
  selectedCount,
  onConfirmIssue,
  isIssuingAccount = false,
  alreadyIssuedCount,
  onDownloadCSV
}: FloatingFooterMerchantProps) {
  const [showModal, setShowModal] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    onConfirmIssue();
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-12">
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

            <Button
              onClick={handleOpenModal}
              disabled={isIssuingAccount}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg"
            >
              {isIssuingAccount ? '発行中...' : 'アカウント発行'}
            </Button>
          </div>
        </div>
      </div>

      <BulkIssueAccountConfirmModal
        isOpen={showModal}
        onClose={handleClose}
        onConfirm={handleConfirm}
        selectedCount={selectedCount}
        alreadyIssuedCount={alreadyIssuedCount}
        isIssuing={isIssuingAccount}
      />
    </>
  );
}

