import { useState, useCallback } from 'react';
import {
  validateRequired,
  validateMaxLength,
  validateEmail,
  validatePassword,
} from '@/utils/validation';
import { type AdminFormDataBase, type AdminFormField } from '@hv-development/schemas';

interface UseAdminFormReturn<T extends AdminFormDataBase> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  errors: Partial<T>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  handleInputChange: (field: AdminFormField, value: string) => void;
  validateField: (field: AdminFormField, value: string) => void;
  validateAllFields: () => boolean;
}

interface UseAdminFormOptions {
  passwordRequired?: boolean;
}

export function useAdminForm<T extends AdminFormDataBase>(
  initialFormData: T,
  options: UseAdminFormOptions = {}
): UseAdminFormReturn<T> {
  const [formData, setFormData] = useState<T>(initialFormData);
  const [errors, setErrors] = useState<Partial<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRequired = options.passwordRequired ?? true;

  const validateField = useCallback(
    (field: AdminFormField, value: string) => {
      const newErrors = { ...errors };
      const trimmedPassword = (formData.password || '').trim();
      const trimmedPasswordConfirm = (formData.passwordConfirm || '').trim();

      switch (field) {
        case 'role': {
          const roleError = validateRequired(value, '権限');
          if (roleError) {
            (newErrors as Partial<T>).role = roleError as T['role'];
          } else {
            delete (newErrors as Partial<T>).role;
          }
          break;
        }
        case 'lastName': {
          const lastNameError =
            validateRequired(value, '姓') || validateMaxLength(value, 50, '姓');
          if (lastNameError) {
            (newErrors as Partial<T>).lastName = lastNameError as T['lastName'];
          } else {
            delete (newErrors as Partial<T>).lastName;
          }
          break;
        }
        case 'firstName': {
          const firstNameError =
            validateRequired(value, '名') || validateMaxLength(value, 50, '名');
          if (firstNameError) {
            (newErrors as Partial<T>).firstName = firstNameError as T['firstName'];
          } else {
            delete (newErrors as Partial<T>).firstName;
          }
          break;
        }
        case 'email': {
          const emailError =
            validateRequired(value, 'メールアドレス') ||
            validateMaxLength(value, 255, 'メールアドレス') ||
            validateEmail(value);
          if (emailError) {
            (newErrors as Partial<T>).email = emailError as T['email'];
          } else {
            delete (newErrors as Partial<T>).email;
          }
          break;
        }
        case 'password': {
          const currentValue = value || '';
          const trimmedValue = currentValue.trim();
          const shouldValidatePassword =
            passwordRequired ||
            trimmedValue.length > 0 ||
            trimmedPasswordConfirm.length > 0;

          if (shouldValidatePassword) {
            const passwordError =
              (passwordRequired || trimmedPasswordConfirm.length > 0
                ? validateRequired(trimmedValue, 'パスワード')
                : null) ||
              (trimmedValue.length > 0 ? validateMaxLength(trimmedValue, 255, 'パスワード') : null) ||
              (trimmedValue.length > 0 ? validatePassword(trimmedValue) : null);

            if (passwordError) {
              (newErrors as Partial<T>).password = passwordError as T['password'];
            } else {
              delete (newErrors as Partial<T>).password;
            }
          } else {
            delete (newErrors as Partial<T>).password;
          }
          break;
        }
        case 'passwordConfirm': {
          const currentValue = value || '';
          const trimmedValue = currentValue.trim();
          const shouldValidatePasswordConfirm =
            passwordRequired ||
            trimmedPassword.length > 0 ||
            trimmedValue.length > 0;

          if (shouldValidatePasswordConfirm) {
            const passwordConfirmError =
              (passwordRequired || trimmedPassword.length > 0
                ? validateRequired(trimmedValue, 'パスワード確認')
                : null) ||
              (trimmedValue.length > 0 ? validateMaxLength(trimmedValue, 255, 'パスワード確認') : null) ||
              (trimmedValue.length > 0 ? validatePassword(trimmedValue) : null);

            let finalError = passwordConfirmError;
            if (!finalError && trimmedPassword !== trimmedValue) {
              finalError = 'パスワードが一致しません';
            }

            if (finalError) {
              (newErrors as Partial<T>).passwordConfirm = finalError as T['passwordConfirm'];
            } else {
              delete (newErrors as Partial<T>).passwordConfirm;
            }
          } else {
            delete (newErrors as Partial<T>).passwordConfirm;
          }
          break;
        }
      }

      setErrors(newErrors);
    },
    [errors, formData, passwordRequired]
  );

  const validateAllFields = useCallback((): boolean => {
    const newErrors: Partial<T> = {};

    const roleError = validateRequired(formData.role, '権限');
    if (roleError) (newErrors as Partial<T>).role = roleError as T['role'];

    const lastNameError =
      validateRequired(formData.lastName, '姓') ||
      validateMaxLength(formData.lastName, 50, '姓');
    if (lastNameError) (newErrors as Partial<T>).lastName = lastNameError as T['lastName'];

    const firstNameError =
      validateRequired(formData.firstName, '名') ||
      validateMaxLength(formData.firstName, 50, '名');
    if (firstNameError) (newErrors as Partial<T>).firstName = firstNameError as T['firstName'];

    const emailError =
      validateRequired(formData.email, 'メールアドレス') ||
      validateMaxLength(formData.email, 255, 'メールアドレス') ||
      validateEmail(formData.email);
    if (emailError) (newErrors as Partial<T>).email = emailError as T['email'];

    const trimmedPassword = (formData.password || '').trim();
    const trimmedPasswordConfirm = (formData.passwordConfirm || '').trim();
    const shouldValidatePassword =
      passwordRequired || trimmedPassword.length > 0 || trimmedPasswordConfirm.length > 0;

    if (shouldValidatePassword) {
      const passwordError =
        (passwordRequired || trimmedPasswordConfirm.length > 0
          ? validateRequired(trimmedPassword, 'パスワード')
          : null) ||
        (trimmedPassword.length > 0 ? validateMaxLength(trimmedPassword, 255, 'パスワード') : null) ||
        (trimmedPassword.length > 0 ? validatePassword(trimmedPassword) : null);
      if (passwordError) (newErrors as Partial<T>).password = passwordError as T['password'];

      const passwordConfirmError =
        (passwordRequired || trimmedPassword.length > 0
          ? validateRequired(trimmedPasswordConfirm, 'パスワード確認')
          : null) ||
        (trimmedPasswordConfirm.length > 0
          ? validateMaxLength(trimmedPasswordConfirm, 255, 'パスワード確認')
          : null) ||
        (trimmedPasswordConfirm.length > 0 ? validatePassword(trimmedPasswordConfirm) : null);
      if (passwordConfirmError)
        (newErrors as Partial<T>).passwordConfirm = passwordConfirmError as T['passwordConfirm'];

      const passwordMatchError =
        trimmedPassword.length > 0 || trimmedPasswordConfirm.length > 0
          ? trimmedPassword !== trimmedPasswordConfirm
            ? 'パスワードが一致しません'
            : null
          : null;
      if (passwordMatchError)
        (newErrors as Partial<T>).passwordConfirm = passwordMatchError as T['passwordConfirm'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, passwordRequired]);

  const handleInputChange = useCallback(
    (field: AdminFormField, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // リアルタイムバリデーション
      validateField(field, value);
    },
    [validateField]
  );

  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateField,
    validateAllFields,
  };
}

