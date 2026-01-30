'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import AdminFormFields from '@/components/molecules/admin-form-fields';
import AdminConfirmationFields from '@/components/molecules/admin-confirmation-fields';
import ToastContainer from '@/components/molecules/toast-container';
import { useAdminForm } from '@/hooks/use-admin-form';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { handleAdminError } from '@/hooks/use-admin-error-handler';
import { type AdminFormData, type AdminAccountInput } from '@hv-development/schemas';
import { useAuth } from '@/components/contexts/auth-context';

export const dynamic = 'force-dynamic';

function AdminEditForm() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const adminId = params.id as string;
  
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [isLoading, setIsLoading] = useState(true);

  const initialFormData: AdminFormData = {
    role: '',
    lastName: '',
    firstName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  };

  const {
    formData,
    setFormData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateAllFields,
  } = useAdminForm<AdminFormData>(initialFormData, { passwordRequired: false });

  // 管理者データを取得
  useEffect(() => {
    const fetchAdminAccount = async () => {
      try {
        setIsLoading(true);
        const adminData = (await apiClient.getAdminAccountById(adminId)) as AdminFormData & {
          firstName?: string;
          lastName?: string;
          role?: string;
        };
        if (adminData) {
          setFormData(prev => ({
            ...prev,
            role: adminData.role || '',
            firstName: adminData.firstName || '',
            lastName: adminData.lastName || '',
            email: adminData.email || '',
            password: '',
            passwordConfirm: '',
          }));
        }
      } catch (error) {
        console.error('管理者アカウント情報の取得に失敗しました:', error);
        showError('管理者アカウント情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminAccount();
  }, [adminId, setFormData, showError]);

  // 入力画面から確認画面へ遷移
  const handleProceedToConfirm = () => {
    setIsSubmitting(true);
    if (validateAllFields()) {
      setStep('confirm');
    }
    setIsSubmitting(false);
  };

  // 確認画面から入力画面へ戻る
  const handleBackToInput = () => {
    setStep('input');
  };

  // キャンセル（一覧画面に戻る）
  const handleCancel = () => {
    router.push('/admins');
  };

  // 更新処理
  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const trimmedPassword = (formData.password || '').trim();
      const updateData: Partial<AdminAccountInput> = {
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      };
      if (trimmedPassword) {
        updateData.password = trimmedPassword;
      }

      const result = await apiClient.updateAdminAccountById(adminId, updateData as AdminAccountInput) as { emailChangeRequested?: boolean; message?: string };
      
      // 一覧画面にリダイレクト（トーストは一覧画面で表示）
      // sessionStorageにトーストメッセージを保存（同一ページ内のステップ変更からのrouter.pushでURLパラメータが失われる問題を回避）
      if (result?.emailChangeRequested) {
        // メールアドレス変更時は確認メール送信のメッセージを表示
        sessionStorage.setItem('adminToast', 'メールアドレス変更確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。');
      } else {
        sessionStorage.setItem('adminToast', '管理者アカウント情報を更新しました');
      }
      router.push('/admins');
    } catch (error: unknown) {
      const errorInfo = handleAdminError(error);
      
      if (errorInfo.isEmailConflict) {
        // トーストでエラーメッセージを表示
        showError(errorInfo.message);
        // 入力内容を維持したまま入力フォームに戻る
        setStep('input');
        setIsSubmitting(false);
        return;
      }
      
      console.error('管理者アカウント情報の更新に失敗しました:', error);
      showError('管理者アカウント情報の更新に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">データを読み込んでいます...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="space-y-6">
        {/* 入力画面 */}
        {step === 'input' && (
          <>
            {/* ページタイトル */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900">管理者アカウント編集</h1>
                  <p className="text-gray-600">管理者アカウント情報を編集します</p>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Icon name="admin" size="sm" className="text-gray-600" />
                      <span className="font-medium text-gray-900">{displayName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 編集フォーム */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="space-y-6">
                <AdminFormFields
                  formData={formData}
                  errors={errors}
                  onInputChange={handleInputChange}
                  isPasswordRequired={false}
                />

                {/* アクションボタン */}
                <div className="flex justify-center space-x-4 pt-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleCancel}
                    className="px-8"
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleProceedToConfirm}
                    disabled={isSubmitting}
                    className="px-8"
                  >
                    {isSubmitting ? '処理中...' : '変更内容を確認する'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 確認画面 */}
        {step === 'confirm' && (
          <>
            {/* ページタイトル */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900">管理者アカウント変更内容確認</h1>
                  <p className="text-gray-600">変更内容を確認してください</p>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Icon name="admin" size="sm" className="text-gray-600" />
                      <span className="font-medium text-gray-900">{displayName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 確認内容 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <AdminConfirmationFields adminData={formData} />

              {/* アクションボタン */}
              <div className="flex justify-center space-x-4 pt-6 mt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBackToInput}
                  className="px-8"
                >
                  変更内容を修正する
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleUpdate}
                  className="px-8"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '更新中...' : '更新する'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminEditPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">データを読み込んでいます...</p>
        </div>
      </AdminLayout>
    }>
      <AdminEditForm />
    </Suspense>
  );
}











