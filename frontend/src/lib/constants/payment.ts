// クレジットカードブランド
export const CREDIT_CARD_BRANDS = [
  'VISA',
  'Mastercard',
  'JCB',
  'AMEX',
  'Diners',
  'その他',
] as const;

// QRコード決済サービス
export const QR_PAYMENT_SERVICES = [
  'PayPay',
  'LINE Pay',
  '楽天Pay',
  'au PAY',
  'd払い',
  'メルペイ',
  'AEON PAY',
  'その他',
] as const;

export type CreditCardBrand = typeof CREDIT_CARD_BRANDS[number];
export type QrPaymentService = typeof QR_PAYMENT_SERVICES[number];


