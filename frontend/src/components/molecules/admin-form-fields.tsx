import { type AdminFormDataBase, type AdminFormFieldsProps } from '@hv-development/schemas';

interface AdminFormFieldsOptions {
  isPasswordRequired?: boolean;
}

export default function AdminFormFields<T extends AdminFormDataBase>({
  formData,
  errors,
  onInputChange,
  isPasswordRequired = true,
}: AdminFormFieldsProps<T> & AdminFormFieldsOptions) {
  return (
    <>
      {/* 姓 */}
      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
          姓 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="lastName"
          placeholder="姓を入力（最大50文字）"
          value={formData.lastName}
          onChange={(e) => onInputChange('lastName', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.lastName ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={50}
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-red-500">{errors.lastName as string}</p>
        )}
      </div>

      {/* 名 */}
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
          名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="firstName"
          placeholder="名を入力（最大50文字）"
          value={formData.firstName}
          onChange={(e) => onInputChange('firstName', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.firstName ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={50}
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-500">{errors.firstName as string}</p>
        )}
      </div>

      {/* メールアドレス */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          placeholder="xxxxxx@xxx.xxx（最大255文字）"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={255}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email as string}</p>
        )}
      </div>

      {/* パスワード */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          パスワード{' '}
          {isPasswordRequired ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-gray-500 text-xs align-middle">(任意)</span>
          )}
        </label>
        <input
          type="password"
          id="password"
          placeholder="英数字混在で8文字以上"
          value={formData.password}
          onChange={(e) => onInputChange('password', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={255}
        />
        {!isPasswordRequired && (
          <p className="mt-1 text-xs text-gray-500">変更しない場合は空欄のままで問題ありません。</p>
        )}
        {errors.password && (
          <p className="mt-1 text-sm text-red-500">{errors.password as string}</p>
        )}
      </div>

      {/* パスワード確認 */}
      <div>
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
          パスワード確認{' '}
          {isPasswordRequired ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-gray-500 text-xs align-middle">(任意)</span>
          )}
        </label>
        <input
          type="password"
          id="passwordConfirm"
          placeholder="パスワードを再入力"
          value={formData.passwordConfirm}
          onChange={(e) => onInputChange('passwordConfirm', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.passwordConfirm ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={255}
        />
        {errors.passwordConfirm && (
          <p className="mt-1 text-sm text-red-500">{errors.passwordConfirm as string}</p>
        )}
      </div>

      {/* 権限 */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
          権限 <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => onInputChange('role', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
            errors.role ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">権限を選択してください</option>
          <option value="sysadmin">管理者</option>
          <option value="operator">一般</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-red-500">{errors.role as string}</p>
        )}
      </div>
    </>
  );
}

