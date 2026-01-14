'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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

function AdminRegistrationForm() {
  const router = useRouter();
  const auth = useAuth();
  const displayName = auth?.user?.name ?? '—';
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  const initialFormData: AdminFormData = {
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  };

  const {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateAllFields,
  } = useAdminForm<AdminFormData>(initialFormData);

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

  // 登録処理
  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      const adminAccountData: AdminAccountInput = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        status: "active",
        sendInvite: true,
        inviteTemplate: "default",
        metadata: { "note": "新規入社" },
      };

      await apiClient.createAdminAccount(adminAccountData);
      showSuccess('管理者アカウントを登録しました');
      
      // 少し待ってからリダイレクト（トーストを表示するため）
      setTimeout(() => {
        router.push('/admins');
      }, 1000);
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
      
      console.error('管理者アカウントの作成に失敗しました:', error);
      showError('管理者アカウントの作成に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

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
                  <h1 className="text-2xl font-bold text-gray-900">管理者アカウント新規登録</h1>
                  <p className="text-gray-600">新しい管理者アカウントを登録します</p>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Icon name="admin" size="sm" className="text-gray-600" />
                      <span className="font-medium text-gray-900">{displayName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 登録フォーム */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="space-y-6">
                <AdminFormFields
                  formData={formData}
                  errors={errors}
                  onInputChange={handleInputChange}
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
                    {isSubmitting ? '処理中...' : '登録内容を確認する'}
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
                  <h1 className="text-2xl font-bold text-gray-900">管理者アカウント登録内容確認</h1>
                  <p className="text-gray-600">入力内容を確認してください</p>
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
                  登録内容を修正する
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRegister}
                  className="px-8"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '登録中...' : '登録する'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminNewPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">データを読み込んでいます...</p>
        </div>
      </AdminLayout>
    }>
      <AdminRegistrationForm />
    </Suspense>
  );
}
