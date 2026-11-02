'use client';

import { useEffect } from 'react';
import Toast from '@/components/atoms/Toast';
import { useToast } from '@/hooks/use-toast';
import { API_FORBIDDEN_EVENT } from '@/lib/api';

const FORBIDDEN_MESSAGE = 'この操作を行う権限がありません';
const DUPLICATE_WINDOW_MS = 3000;

/**
 * APIが403（権限不足）を返したときに、どの画面でもエラーを表示する
 * 各画面のトーストは右上に出るので、重ならないよう中央に出す
 */
export default function ForbiddenNotifier() {
  const { toasts, removeToast, showError } = useToast();

  useEffect(() => {
    let lastShownAt = 0;

    const handleForbidden = () => {
      // 同じ画面で続けて403になっても1回だけ表示する
      const now = Date.now();
      if (now - lastShownAt < DUPLICATE_WINDOW_MS) return;
      lastShownAt = now;
      showError(FORBIDDEN_MESSAGE);
    };

    window.addEventListener(API_FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(API_FORBIDDEN_EVENT, handleForbidden);
  }, [showError]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}
