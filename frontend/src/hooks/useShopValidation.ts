import { useCallback } from 'react';
import {
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
  isValidPrefecture,
  isValidCity,
  isValidAddressDetail,
  isValidKana,
  isValidShopName,
} from '@hv-development/schemas';
import type { ExtendedShopCreateRequest } from '@/types/shop';

interface UseShopValidationOptions {
  formData: ExtendedShopCreateRequest;
  touchedFields: Record<string, boolean>;
  isEdit: boolean;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const REQUIRED_FIELD_LABELS: Partial<Record<keyof ExtendedShopCreateRequest, string>> = {
  merchantId: '事業者',
  genreId: 'ジャンル',
  name: '店舗名',
  phone: '電話番号',
  postalCode: '郵便番号',
  prefecture: '都道府県',
  city: '市区町村',
  address1: '番地以降',
  smokingType: '喫煙タイプ',
};

const COUPON_USAGE_PAIR_ERROR = 'クーポン利用時間は開始・終了をセットで入力してください';
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useShopValidation({
  formData,
  touchedFields,
  isEdit,
  setValidationErrors,
}: UseShopValidationOptions) {
  const validateField = useCallback(
    (
      field: keyof ExtendedShopCreateRequest,
      value: string | boolean | number | undefined,
      currentFormData?: ExtendedShopCreateRequest,
      currentTouchedFields?: Record<string, boolean>,
    ) => {
      const latestFormData = currentFormData || formData;
      const latestTouchedFields = currentTouchedFields || touchedFields;
      const updatedFormData: ExtendedShopCreateRequest = {
        ...latestFormData,
        [field]: value,
      };
      const isFieldTouched = latestTouchedFields[field] ?? false;

      if (field === 'couponUsageStart' || field === 'couponUsageEnd') {
        const hasTouchedPair =
          (latestTouchedFields.couponUsageStart ?? false) ||
          (latestTouchedFields.couponUsageEnd ?? false);

        const startError = validateShopFieldInternal(
          'couponUsageStart',
          updatedFormData.couponUsageStart ?? '',
          updatedFormData,
        );
        const endError = validateShopFieldInternal(
          'couponUsageEnd',
          updatedFormData.couponUsageEnd ?? '',
          updatedFormData,
        );

        setValidationErrors((prev) => {
          const newErrors = { ...prev };

          if (!hasTouchedPair) {
            delete newErrors.couponUsageStart;
            delete newErrors.couponUsageEnd;
            return newErrors;
          }

          if (startError) {
            newErrors.couponUsageStart = startError;
          } else {
            delete newErrors.couponUsageStart;
          }

          if (endError) {
            newErrors.couponUsageEnd = endError;
          } else {
            delete newErrors.couponUsageEnd;
          }

          const pairError = validateCouponUsagePairInternal(updatedFormData);
          if (pairError) {
            newErrors.couponUsageStart = pairError;
            newErrors.couponUsageEnd = pairError;
          } else if (
            newErrors.couponUsageStart === COUPON_USAGE_PAIR_ERROR &&
            newErrors.couponUsageEnd === COUPON_USAGE_PAIR_ERROR
          ) {
            delete newErrors.couponUsageStart;
            delete newErrors.couponUsageEnd;
          }

          return newErrors;
        });
        return;
      }

      if (!isFieldTouched) {
        setValidationErrors((prev) => {
          if (!(field in prev)) {
            return prev;
          }
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
        return;
      }

      const error = validateShopFieldInternal(field, value, updatedFormData);

      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field as string] = error;
        } else {
          delete newErrors[field as string];
        }
        return newErrors;
      });
    },
    [formData, touchedFields, isEdit, setValidationErrors],
  );

  return { validateField };
}

function validateCouponUsagePairInternal(form: ExtendedShopCreateRequest): string | null {
  const hasStart = typeof form.couponUsageStart === 'string' && form.couponUsageStart.trim().length > 0;
  const hasEnd = typeof form.couponUsageEnd === 'string' && form.couponUsageEnd.trim().length > 0;
  if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
    return COUPON_USAGE_PAIR_ERROR;
  }
  return null;
}

function validateShopFieldInternal(
  field: keyof ExtendedShopCreateRequest,
  value: unknown,
  formData: ExtendedShopCreateRequest,
): string | null {
  const requiredLabel = REQUIRED_FIELD_LABELS[field];
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (requiredLabel) {
    const isEmpty =
      trimmedValue === '' ||
      trimmedValue === null ||
      trimmedValue === undefined;
    if (isEmpty) {
      return `${requiredLabel}は必須です`;
    }
  }

  switch (field) {
    case 'name':
      if (typeof value === 'string' && !isValidShopName(value)) {
        return '店舗名は1文字以上100文字以内で入力してください';
      }
      return null;
    case 'nameKana':
      if (typeof value === 'string' && value.trim().length > 0) {
        if (value.length > 100) {
          return '店舗名（カナ）は100文字以内で入力してください';
        }
        if (!isValidKana(value)) {
          return '店舗名（カナ）は全角カタカナで入力してください';
        }
      }
      return null;
    case 'phone':
      if (typeof value === 'string' && value.trim().length > 0 && !isValidPhone(value)) {
        return '有効な電話番号を入力してください（10-11桁の数字）';
      }
      return null;
    case 'postalCode':
      if (typeof value === 'string' && value.trim().length > 0 && !isValidPostalCode(value)) {
        return '郵便番号は7桁の数字で入力してください';
      }
      return null;
    case 'prefecture':
      if (typeof value === 'string' && value.trim().length > 0 && !isValidPrefecture(value)) {
        return '都道府県は1文字以上50文字以下で入力してください';
      }
      return null;
    case 'city':
      if (typeof value === 'string' && value.trim().length > 0 && !isValidCity(value)) {
        return '市区町村は1文字以上50文字以下で入力してください';
      }
      return null;
    case 'address1':
      if (typeof value === 'string' && value.trim().length > 0 && !isValidAddressDetail(value)) {
        return '番地以降は1文字以上100文字以内で入力してください';
      }
      return null;
    case 'accountEmail': {
      if (formData.createAccount && (typeof value !== 'string' || value.trim().length === 0)) {
        return 'メールアドレスは必須です';
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        if (!isValidEmail(value)) {
          return '有効なメールアドレスを入力してください';
        }
        if (value.length > 255) {
          return 'メールアドレスは255文字以内で入力してください';
        }
      }
      return null;
    }
    case 'password': {
      if (formData.createAccount) {
        if (typeof value !== 'string' || value.length === 0) {
          return 'パスワードは必須です';
        }
        if (value.length < 8) {
          return 'パスワードは8文字以上で入力してください';
        }
      } else if (typeof value === 'string' && value.length > 0 && value.length < 8) {
        return 'パスワードは8文字以上で入力してください';
      }
      return null;
    }
    case 'description':
      if (typeof value === 'string' && value.length > 500) {
        return '店舗紹介説明は500文字以内で入力してください';
      }
      return null;
    case 'details':
      if (typeof value === 'string' && value.length > 1000) {
        return '詳細情報は1000文字以内で入力してください';
      }
      return null;
    case 'customSceneText':
      if (typeof value === 'string' && value.length > 100) {
        return '具体的な利用シーンは100文字以内で入力してください';
      }
      return null;
    case 'homepageUrl':
      if (typeof value === 'string' && value.trim().length > 0) {
        try {
          new URL(value);
        } catch {
          return '有効なURLを入力してください';
        }
      }
      return null;
    case 'couponUsageStart':
    case 'couponUsageEnd': {
      if (typeof value === 'string' && value.trim().length > 0 && !TIME_PATTERN.test(value)) {
        return 'クーポン利用時間はHH:MM形式で入力してください';
      }
      const start =
        field === 'couponUsageStart'
          ? (typeof value === 'string' ? value : formData.couponUsageStart)
          : formData.couponUsageStart;
      const end =
        field === 'couponUsageEnd'
          ? (typeof value === 'string' ? value : formData.couponUsageEnd)
          : formData.couponUsageEnd;
      return validateCouponUsagePairInternal({
        ...formData,
        couponUsageStart: typeof start === 'string' ? start : undefined,
        couponUsageEnd: typeof end === 'string' ? end : undefined,
      });
    }
    case 'merchantId':
    case 'genreId':
      if (typeof value === 'string' && value.trim().length > 0 && !UUID_PATTERN.test(value)) {
        return '有効なIDを指定してください';
      }
      return null;
    default:
      return null;
  }
}

