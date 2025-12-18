// 共通バリデーション関数
export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName}は必須です`;
  }
  return null;
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): string | null => {
  if (value.length > maxLength) {
    return `${fieldName}は${maxLength}文字以内で入力してください`;
  }
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (value.length < minLength) {
    return `${fieldName}は${minLength}文字以上で入力してください`;
  }
  return null;
};

export const validateEmail = (value: string): string | null => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'メールアドレスの形式が正しくありません';
  }
  return null;
};

export const validatePostalCode = (value: string): string | null => {
  if (value && (value.length !== 7 || !/^\d{7}$/.test(value))) {
    return '郵便番号は7桁の数字で入力してください';
  }
  return null;
};

export const validatePhone = (value: string): string | null => {
  if (value && value.length > 12) {
    return '電話番号は12文字以内で入力してください';
  }
  return null;
};

export const validateUrl = (value: string): string | null => {
  if (value && !/^https?:\/\/.+/.test(value)) {
    return 'URL形式で入力してください（http://またはhttps://で始まる）';
  }
  return null;
};

export const validateShopCode = (value: string): string | null => {
  if (value && (value.length < 3 || value.length > 6 || !/^[A-Z0-9]+$/.test(value))) {
    return '店舗CDは3-6文字の大文字英語または数字で入力してください';
  }
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (value && value.length < 8) {
    return 'パスワードは8文字以上で入力してください';
  }
  if (value && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/.test(value)) {
    return 'パスワードは英数字混在で入力してください';
  }
  return null;
};

export const validateDate = (value: string): string | null => {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '日付の形式が正しくありません';
  }
  return null;
};

export const validateFileSize = (file: File | null, maxSizeMB: number): string | null => {
  if (file && file.size > maxSizeMB * 1024 * 1024) {
    return `ファイルサイズは${maxSizeMB}MB以下にしてください`;
  }
  return null;
};

export const validateFileType = (file: File | null, allowedTypes: string[]): string | null => {
  if (file && !allowedTypes.includes(file.type)) {
    return 'JPEG形式のファイルのみアップロード可能です';
  }
  return null;
};