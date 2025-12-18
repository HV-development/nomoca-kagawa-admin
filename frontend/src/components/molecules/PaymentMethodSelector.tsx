'use client';

import React from 'react';
import ErrorMessage from '@/components/atoms/ErrorMessage';
import { CREDIT_CARD_BRANDS, QR_PAYMENT_SERVICES } from '@/lib/constants/payment';

interface PaymentMethodSelectorProps {
  paymentCash: boolean;
  paymentSaicoin: boolean;
  paymentTamapon: boolean;
  selectedCreditBrands: string[];
  customCreditText: string;
  selectedQrBrands: string[];
  customQrText: string;
  validationErrors: Record<string, string>;
  onPaymentChange: (field: 'paymentCash' | 'paymentSaicoin' | 'paymentTamapon', value: boolean) => void;
  onCreditBrandsChange: (brands: string[]) => void;
  onCreditTextChange: (text: string) => void;
  onQrBrandsChange: (brands: string[]) => void;
  onQrTextChange: (text: string) => void;
  onValidationErrorChange: (field: string, error: string | null) => void;
}

export default function PaymentMethodSelector({
  paymentCash,
  paymentSaicoin,
  paymentTamapon,
  selectedCreditBrands,
  customCreditText,
  selectedQrBrands,
  customQrText,
  validationErrors,
  onPaymentChange,
  onCreditBrandsChange,
  onCreditTextChange,
  onQrBrandsChange,
  onQrTextChange,
  onValidationErrorChange,
}: PaymentMethodSelectorProps) {
  const handleCreditBrandToggle = (brand: string, checked: boolean) => {
    if (checked) {
      onCreditBrandsChange([...selectedCreditBrands, brand]);
    } else {
      const newBrands = selectedCreditBrands.filter(b => b !== brand);
      onCreditBrandsChange(newBrands);
      // 「その他」のチェックを外したらカスタムテキストもクリア
      if (brand === 'その他') {
        onCreditTextChange('');
        onValidationErrorChange('customCreditText', null);
      }
    }
  };

  const handleQrBrandToggle = (service: string, checked: boolean) => {
    if (checked) {
      onQrBrandsChange([...selectedQrBrands, service]);
    } else {
      const newBrands = selectedQrBrands.filter(s => s !== service);
      onQrBrandsChange(newBrands);
      // 「その他」のチェックを外したらカスタムテキストもクリア
      if (service === 'その他') {
        onQrTextChange('');
        onValidationErrorChange('customQrText', null);
      }
    }
  };

  const handleCreditTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const isCreditOtherSelected = selectedCreditBrands.includes('その他');
    if (isCreditOtherSelected) {
      if (!e.target.value || e.target.value.trim().length === 0) {
        onValidationErrorChange('customCreditText', 'その他のクレジットカードブランド名を入力してください');
      } else if (e.target.value.length > 100) {
        onValidationErrorChange('customCreditText', 'その他のクレジットカードブランド名は100文字以内で入力してください');
      } else {
        onValidationErrorChange('customCreditText', null);
      }
    }
  };

  const handleCreditTextInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const isCreditOtherSelected = selectedCreditBrands.includes('その他');
    if (isCreditOtherSelected) {
      if (target.value.length > 100) {
        onValidationErrorChange('customCreditText', 'その他のクレジットカードブランド名は100文字以内で入力してください');
      } else if (target.value.trim().length === 0) {
        onValidationErrorChange('customCreditText', 'その他のクレジットカードブランド名を入力してください');
      } else {
        onValidationErrorChange('customCreditText', null);
      }
    }
  };

  const handleQrTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const isQrOtherSelected = selectedQrBrands.includes('その他');
    if (isQrOtherSelected) {
      if (!e.target.value || e.target.value.trim().length === 0) {
        onValidationErrorChange('customQrText', 'その他のQRコード決済サービス名を入力してください');
      } else if (e.target.value.length > 100) {
        onValidationErrorChange('customQrText', 'その他のQRコード決済サービス名は100文字以内で入力してください');
      } else {
        onValidationErrorChange('customQrText', null);
      }
    }
  };

  const handleQrTextInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const isQrOtherSelected = selectedQrBrands.includes('その他');
    if (isQrOtherSelected) {
      if (target.value.length > 100) {
        onValidationErrorChange('customQrText', 'その他のQRコード決済サービス名は100文字以内で入力してください');
      } else if (target.value.trim().length === 0) {
        onValidationErrorChange('customQrText', 'その他のQRコード決済サービス名を入力してください');
      } else {
        onValidationErrorChange('customQrText', null);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">決済情報</h2>
      
      <div className="space-y-6">
        {/* 現金決済 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            現金決済
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentCash"
                checked={paymentCash === true}
                onChange={() => onPaymentChange('paymentCash', true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">可</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentCash"
                checked={paymentCash === false}
                onChange={() => onPaymentChange('paymentCash', false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">不可</span>
            </label>
          </div>
        </div>

        {/* さいコイン決済 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            さいコイン決済
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentSaicoin"
                checked={paymentSaicoin === true}
                onChange={() => onPaymentChange('paymentSaicoin', true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">可</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentSaicoin"
                checked={paymentSaicoin === false}
                onChange={() => onPaymentChange('paymentSaicoin', false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">不可</span>
            </label>
          </div>
        </div>

        {/* たまポン決済 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            たまポン決済
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentTamapon"
                checked={paymentTamapon === true}
                onChange={() => onPaymentChange('paymentTamapon', true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">可</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="paymentTamapon"
                checked={paymentTamapon === false}
                onChange={() => onPaymentChange('paymentTamapon', false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">不可</span>
            </label>
          </div>
        </div>

        {/* クレジットカード決済 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            クレジットカード決済（複数選択可）
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {CREDIT_CARD_BRANDS.map((brand) => (
              <label
                key={brand}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={brand}
                  checked={selectedCreditBrands.includes(brand)}
                  onChange={(e) => handleCreditBrandToggle(brand, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{brand}</span>
              </label>
            ))}
          </div>
          
          {/* 「その他」選択時のカスタムテキスト入力欄 */}
          {selectedCreditBrands.includes('その他') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                その他のクレジットカードブランド <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customCreditText"
                value={customCreditText}
                onChange={(e) => onCreditTextChange(e.target.value)}
                onBlur={handleCreditTextBlur}
                onInput={handleCreditTextInput}
                maxLength={100}
                placeholder="例：銀聯カード、Discoverなど"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.customCreditText ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <ErrorMessage message={validationErrors.customCreditText} />
              <p className="mt-1 text-xs text-gray-500">
                「その他」を選択した場合は、具体的なブランド名を入力してください（最大100文字）
              </p>
            </div>
          )}
        </div>

        {/* QRコード決済 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QRコード決済（複数選択可）
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {QR_PAYMENT_SERVICES.map((service) => (
              <label
                key={service}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={service}
                  checked={selectedQrBrands.includes(service)}
                  onChange={(e) => handleQrBrandToggle(service, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{service}</span>
              </label>
            ))}
          </div>
          
          {/* 「その他」選択時のカスタムテキスト入力欄 */}
          {selectedQrBrands.includes('その他') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                その他のQRコード決済サービス <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customQrText"
                value={customQrText}
                onChange={(e) => onQrTextChange(e.target.value)}
                onBlur={handleQrTextBlur}
                onInput={handleQrTextInput}
                maxLength={100}
                placeholder="例：Alipay、WeChat Payなど"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.customQrText ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <ErrorMessage message={validationErrors.customQrText} />
              <p className="mt-1 text-xs text-gray-500">
                「その他」を選択した場合は、具体的なサービス名を入力してください（最大100文字）
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


