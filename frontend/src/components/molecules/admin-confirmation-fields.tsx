import { type AdminFormData } from '@hv-development/schemas';
import { getRoleLabel } from '@/utils/admin';

interface AdminConfirmationFieldsProps {
  adminData: AdminFormData;
}

/**
 * 管理者アカウント確認フォーム表示コンポーネント
 * 登録・編集確認ページで使用される共通コンポーネント
 */
export default function AdminConfirmationFields({
  adminData,
}: AdminConfirmationFieldsProps) {
  const hasPasswordChange = (adminData.password || '').trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          姓
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {adminData.lastName}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          名
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {adminData.firstName}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {adminData.email}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          パスワード
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {hasPasswordChange ? '*'.repeat(adminData.password.length) : '変更なし'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          パスワード確認
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {hasPasswordChange ? '*'.repeat(adminData.passwordConfirm.length) : '変更なし'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          権限
        </label>
        <p className="text-gray-900 bg-gray-50 p-2 rounded">
          {getRoleLabel(adminData.role)}
        </p>
      </div>
    </div>
  );
}
