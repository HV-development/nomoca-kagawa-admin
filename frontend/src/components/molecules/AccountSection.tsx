'use client';

import React from 'react';
import ErrorMessage from '@/components/atoms/ErrorMessage';

interface AccountSectionProps {
  isEdit: boolean;
  hasExistingAccount: boolean;
  createAccount: boolean;
  accountEmail: string;
  password: string;
  confirmPassword?: string;
  validationErrors: Record<string, string>;
  onCreateAccountChange: (value: boolean) => void;
  onAccountEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  onValidationErrorChange: (field: string, error: string | null) => void;
  onFieldBlur?: (field: string, value: string) => void;
  onDeleteAccountChange?: (deleteAccount: boolean) => void;
}

export default function AccountSection({
  isEdit,
  hasExistingAccount,
  createAccount,
  accountEmail,
  password,
  confirmPassword = '',
  validationErrors,
  onCreateAccountChange,
  onAccountEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onValidationErrorChange,
  onFieldBlur,
  onDeleteAccountChange,
}: AccountSectionProps) {
  const shouldDisableEmailInput = isEdit && hasExistingAccount && !createAccount;

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (createAccount) {
      if (onFieldBlur) {
        onFieldBlur('accountEmail', e.target.value);
      }
    }
  };

  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (createAccount) {
      if (onFieldBlur) {
        onFieldBlur('password', e.target.value);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {isEdit && hasExistingAccount ? '店舗用アカウント情報' : 'アカウント発行'}
      </h2>
      <div className="space-y-4">
        {/* アカウント未発行の場合：発行チェックボックスを表示 */}
        {!(isEdit && hasExistingAccount) && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createAccount"
                checked={createAccount}
                onChange={(e) => {
                  onCreateAccountChange(e.target.checked);
                  if (!e.target.checked) {
                    onAccountEmailChange('');
                    onPasswordChange('');
                    onValidationErrorChange('accountEmail', null);
                    onValidationErrorChange('password', null);
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="createAccount" className="text-sm font-medium text-gray-700 cursor-pointer">
                店舗用アカウントを発行する
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              チェックを入れると、店舗用のログインアカウントを発行します。
            </p>
          </div>
        )}

        {/* アカウント発行チェック時、または既存アカウントがある場合：メールアドレスとパスワードを表示 */}
        {(createAccount || (isEdit && hasExistingAccount)) && (
          <div className="space-y-4">
            <div>
              <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス {createAccount && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                id="accountEmail"
                name="accountEmail"
                value={accountEmail}
                onChange={(e) => onAccountEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="店舗用アカウントのメールアドレスを入力"
                maxLength={255}
                disabled={shouldDisableEmailInput}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.accountEmail ? 'border-red-500' : 'border-gray-300'
                } ${shouldDisableEmailInput ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              <ErrorMessage message={validationErrors.accountEmail} />
            </div>

            {/* パスワードフィールド: 新規作成時または編集時（既存アカウントがある場合）に表示 */}
            {(createAccount || (isEdit && hasExistingAccount)) && (
              <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード {createAccount && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                    placeholder={isEdit && hasExistingAccount ? "変更する場合は新しいパスワードを入力" : "8文字以上"}
                  maxLength={255}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <ErrorMessage message={validationErrors.password} />
                <p className="mt-1 text-xs text-gray-500">
                    {isEdit && hasExistingAccount 
                      ? "変更しない場合は空欄のままにしてください" 
                      : "パスワードは8文字以上で入力してください"}
                </p>
                </div>

                {/* 確認用パスワード: 新規登録でアカウント発行時、または編集時で既存アカウントがある場合に表示 */}
                {((createAccount && !isEdit) || (isEdit && hasExistingAccount)) && onConfirmPasswordChange && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      パスワード（確認用） {createAccount && !isEdit && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => onConfirmPasswordChange(e.target.value)}
                      placeholder={isEdit && hasExistingAccount 
                        ? "パスワードを変更する場合は確認用パスワードを入力" 
                        : "パスワードをもう一度入力"}
                      maxLength={255}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <ErrorMessage message={validationErrors.confirmPassword} />
                  </div>
                )}
              </div>
            )}

            {/* アカウント発行済みの場合：削除チェックボックスを表示 */}
            {isEdit && hasExistingAccount && onDeleteAccountChange && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="deleteAccount"
                    checked={!createAccount}
                    onChange={(e) => {
                      onCreateAccountChange(!e.target.checked);
                      onDeleteAccountChange(e.target.checked);
                    }}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="deleteAccount" className="text-sm font-medium text-red-600">
                    アカウントを削除する
                  </label>
                </div>
                <p className="ml-6 text-xs text-gray-500">
                  ※ チェックを入れるとアカウントが無効になり、店舗側でログインできなくなります
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
