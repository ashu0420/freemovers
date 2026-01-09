export const JP_LAUNCH_REGIONS = [
  { value: 'tokyo', labelEn: 'Tokyo', labelJa: '東京都' },
  { value: 'kanagawa', labelEn: 'Kanagawa', labelJa: '神奈川県' },
  { value: 'saitama', labelEn: 'Saitama', labelJa: '埼玉県' },
  { value: 'chiba', labelEn: 'Chiba', labelJa: '千葉県' },
  { value: 'osaka', labelEn: 'Osaka', labelJa: '大阪府' },
] as const;

export type LaunchRegion = (typeof JP_LAUNCH_REGIONS)[number]['value'];

export const PAYMENT_OPTIONS = [
  { value: 'card', labelEn: 'Card', labelJa: 'クレジットカード' },
  { value: 'paypay', labelEn: 'PayPay', labelJa: 'PayPay' },
  { value: 'cash', labelEn: 'Cash', labelJa: '現金' },
  { value: 'bank_transfer', labelEn: 'Bank Transfer', labelJa: '銀行振込' },
] as const;

export type PaymentPreference = (typeof PAYMENT_OPTIONS)[number]['value'];

export function getRegionLabel(region: string, locale: 'en' | 'ja') {
  const found = JP_LAUNCH_REGIONS.find((item) => item.value === region);
  if (!found) return region;
  return locale === 'ja' ? found.labelJa : found.labelEn;
}

export function normalizePostalCode(value: string) {
  return value.replace(/[^\d]/g, '').slice(0, 7);
}
