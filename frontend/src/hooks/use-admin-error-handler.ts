/**
 * 管理者アカウント関連のエラーハンドリングフック
 */

interface AdminErrorHandlerResult {
  isEmailConflict: boolean;
  message: string;
}

/**
 * 管理者アカウント操作時のエラーを処理
 * @param error - エラーオブジェクト
 * @returns エラー情報（メールアドレス重複フラグとエラーメッセージ）
 */
export function handleAdminError(error: unknown): AdminErrorHandlerResult {
  const defaultResult: AdminErrorHandlerResult = {
    isEmailConflict: false,
    message: '',
  };

  if (!(error instanceof Error)) {
    return defaultResult;
  }

  // エラーレスポンスの詳細を取得
  const errorResponse = (
    error as Error & { response?: { status: number; data: unknown } }
  ).response;
  const errorData = errorResponse?.data as
    | { error?: { message?: string } }
    | undefined;
  const errorMessage = error.message || errorData?.error?.message || '';

  // メールアドレス重複エラーのチェック
  // 登録時: 'account already exists'
  // 編集時: 'email already exists'
  const isEmailConflict =
    errorResponse?.status === 409 ||
    errorMessage.toLowerCase().includes('account already exists') ||
    errorMessage.toLowerCase().includes('email already exists');

  if (isEmailConflict) {
    return {
      isEmailConflict: true,
      message: '既に登録されているメールアドレスです。別のメールアドレスを入力してください。',
    };
  }

  return {
    isEmailConflict: false,
    message: errorMessage,
  };
}
