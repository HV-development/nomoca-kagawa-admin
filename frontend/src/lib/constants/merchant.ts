// 事業者ステータスの日本語マッピング
export const statusLabels: Record<string, string> = {
  pending_registration: '登録待ち',
  active: '営業中',
  terminated: '終了',
};

// ステータスオプション（ドロップダウン用）
export const statusOptions = [
  { value: 'pending_registration', label: '登録待ち' },
  { value: 'active', label: '営業中' },
  { value: 'terminated', label: '終了' },
];

// 都道府県一覧（非推奨：@/lib/constants/japan の PREFECTURES を使用してください）
import { PREFECTURES } from '@/lib/constants/japan';
export const prefectures = PREFECTURES;
