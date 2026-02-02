'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api';
import Button from '@/components/atoms/Button';

function VerifyEmailChangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmailChange = async () => {
      if (!token) {
        setStatus('error');
        setMessage('トークンが見つかりません。メール内のリンクを再度クリックしてください。');
        return;
      }

      try {
        const response = await apiClient.confirmEmailChange(token);
        
        // バックエンドのレスポンス形式: { data: { success: true, message: '...' } }
        if (response.data?.success) {
          setStatus('success');
          setMessage(response.data.message || 'メールアドレスが正常に変更されました。');
        } else {
          setStatus('error');
          // エラーレスポンスの形式: { error: { code: '...', message: '...' } } または { error: '...' }
          const errorMessage = 
            (response as any).error?.message || 
            (typeof (response as any).error === 'string' ? (response as any).error : null) ||
            response.error ||
            'メールアドレスの変更に失敗しました。';
          setMessage(errorMessage);
        }
      } catch (error) {
        console.error('Email change verification failed:', error);
        setStatus('error');
        
        if (error instanceof Error) {
          if (error.message.includes('INVALID_TOKEN')) {
            setMessage('無効なトークンです。リンクの有効期限が切れているか、既に使用されている可能性があります。');
          } else if (error.message.includes('TOKEN_EXPIRED')) {
            setMessage('トークンの有効期限が切れています。再度メールアドレス変更をリクエストしてください。');
          } else if (error.message.includes('TOKEN_ALREADY_USED')) {
            setMessage('このトークンは既に使用されています。');
          } else if (error.message.includes('EMAIL_ALREADY_EXISTS')) {
            setMessage('このメールアドレスは既に使用されています。');
          } else {
            setMessage(error.message || 'メールアドレスの変更に失敗しました。');
          }
        } else {
          setMessage('メールアドレスの変更に失敗しました。');
        }
      }
    };

    verifyEmailChange();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            メールアドレス変更
          </h2>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">確認中...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                変更完了
              </h3>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                新しいメールアドレスでログインしてください。
              </p>
              <Button
                onClick={() => router.push('/login')}
                variant="primary"
                className="w-full"
              >
                ログインページへ
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                エラーが発生しました
              </h3>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                className="w-full"
              >
                ログインページへ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}




