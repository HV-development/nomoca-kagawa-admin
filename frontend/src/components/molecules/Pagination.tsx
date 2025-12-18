'use client';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = '' 
}: PaginationProps) {
  // ページ番号の配列を生成（現在のページを中心に最大5ページ表示）
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 総ページ数が5以下の場合は全て表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 現在のページを中心に5ページ表示
      let startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // 終了ページが調整された場合、開始ページも調整
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // 最初のページ
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // 中間のページ
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 最後のページ
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const navigationButtonClass = "flex items-center px-2 py-1 text-sm";

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-end space-x-1 ${className}`}>
      {/* 前へボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={navigationButtonClass}
      >
        <Icon name="chevronLeft" size="sm" className="mr-1" />
        前へ
      </Button>

      {/* ページ番号ボタン */}
      <div className="flex items-center space-x-1">
        {pageNumbers.map((page, index) => 
          page === '...' ? (
            <span key={index} className="px-2 py-1 text-sm text-gray-500">...</span>
          ) : (
            <Button
              key={index}
              variant={currentPage === page ? "primary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="px-3 py-1 text-sm min-w-[32px]"
            >
              {page}
            </Button>
          )
        )}
      </div>

      {/* 次へボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={navigationButtonClass}
      >
        次へ
        <Icon name="chevronRight" size="sm" className="ml-1" />
      </Button>
    </div>
  );
}
