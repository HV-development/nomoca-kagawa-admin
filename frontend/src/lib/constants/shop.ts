// 喫煙タイプの選択肢（enumコード + 日本語表示）
export const SMOKING_OPTIONS = [
  { value: 'non_smoking', label: '禁煙' },
  { value: 'separated', label: '分煙' },
  { value: 'smoking_allowed', label: '喫煙可' },
  { value: 'electronic_only', label: '電子のみ' },
] as const;

// 店舗ステータスラベル
export const statusLabels: Record<string, string> = {
  registering: '登録中',
  collection_requested: '情報収集依頼済み',
  approval_pending: '承認待ち',
  promotional_materials_preparing: '宣材準備中',
  promotional_materials_shipping: '宣材発送中',
  operating: '営業中',
  suspended: '停止中',
  terminated: '終了',
};

// 店舗ステータスオプション
export const statusOptions = [
  { value: 'registering', label: '登録中' },
  { value: 'collection_requested', label: '情報収集依頼済み' },
  { value: 'approval_pending', label: '承認待ち' },
  { value: 'promotional_materials_preparing', label: '宣材準備中' },
  { value: 'promotional_materials_shipping', label: '宣材発送中' },
  { value: 'operating', label: '営業中' },
  { value: 'suspended', label: '停止中' },
  { value: 'terminated', label: '終了' },
] as const;
