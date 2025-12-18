/**
 * CSVエクスポートユーティリティ
 */

// 事業者データの型（一覧表示用）
export type MerchantForCSV = {
  name: string;
  nameKana: string;
  representativeNameLast?: string;
  representativeNameFirst?: string;
  representativeNameLastKana?: string;
  representativeNameFirstKana?: string;
  representativePhone?: string;
  email?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  accountStatus?: string;
  contractStatus?: string;
  createdAt: string;
};

/**
 * CSV行の値をエスケープ（カンマや改行を含む場合にダブルクォートで囲む）
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * アカウントステータスのラベルを取得
 */
function getAccountStatusLabel(status: string): string {
  switch (status) {
    case 'active': return '発行済み';
    case 'inactive': return '未発行';
    case 'pending': return '承認待ち';
    case 'suspended': return '停止中';
    default: return status;
  }
}

/**
 * 契約ステータスのラベルを取得
 */
function getContractStatusLabel(status: string): string {
  switch (status) {
    case 'active': return '契約中';
    case 'inactive': return '未契約';
    case 'terminated': return '解約済み';
    default: return status;
  }
}

/**
 * 日付をフォーマット（YYYY/MM/DD HH:MM形式）
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 事業者データをCSV形式に変換
 * @param merchants 事業者データ配列
 * @param isOperatorRole operatorロールかどうか
 * @returns CSV文字列（UTF-8 BOM付き）
 */
export function convertMerchantsToCSV(
  merchants: MerchantForCSV[],
  isOperatorRole: boolean = false
): string {
  // CSVヘッダー
  const headers: string[] = [];

  if (isOperatorRole) {
    // operatorロールの場合は限定的な項目のみ
    headers.push(
      '事業者名',
      '事業者名（カナ）',
      'アカウント発行',
      '契約ステータス',
      '登録日'
    );
  } else {
    // 全項目
    headers.push(
      '事業者名',
      '事業者名（カナ）',
      '代表者名',
      '代表者名（カナ）',
      '電話番号',
      'メールアドレス',
      '郵便番号',
      '都道府県',
      '市区町村',
      '番地',
      '建物名・部屋番号',
      'アカウント発行',
      '契約ステータス',
      '登録日'
    );
  }

  // ヘッダー行を作成
  const headerRow = headers.map(escapeCSVValue).join(',');

  // データ行を作成
  const dataRows = merchants.map((merchant) => {
    const values: string[] = [];

    if (isOperatorRole) {
      values.push(
        escapeCSVValue(merchant.name || ''),
        escapeCSVValue(merchant.nameKana || ''),
        escapeCSVValue(getAccountStatusLabel(merchant.accountStatus || 'inactive')),
        escapeCSVValue(getContractStatusLabel(merchant.contractStatus || 'active')),
        escapeCSVValue(formatDate(merchant.createdAt))
      );
    } else {
      const fullName = merchant.representativeNameLast && merchant.representativeNameFirst
        ? `${merchant.representativeNameLast} ${merchant.representativeNameFirst}`
        : '';
      const fullNameKana = merchant.representativeNameLastKana && merchant.representativeNameFirstKana
        ? `${merchant.representativeNameLastKana} ${merchant.representativeNameFirstKana}`
        : '';

      values.push(
        escapeCSVValue(merchant.name || ''),
        escapeCSVValue(merchant.nameKana || ''),
        escapeCSVValue(fullName),
        escapeCSVValue(fullNameKana),
        escapeCSVValue(merchant.representativePhone || ''),
        escapeCSVValue(merchant.email || ''),
        escapeCSVValue(merchant.postalCode || ''),
        escapeCSVValue(merchant.prefecture || ''),
        escapeCSVValue(merchant.city || ''),
        escapeCSVValue(merchant.address1 || ''),
        escapeCSVValue(merchant.address2 || ''),
        escapeCSVValue(getAccountStatusLabel(merchant.accountStatus || 'inactive')),
        escapeCSVValue(getContractStatusLabel(merchant.contractStatus || 'active')),
        escapeCSVValue(formatDate(merchant.createdAt))
      );
    }

    return values.join(',');
  });

  // ヘッダーとデータ行を結合
  const csvContent = [headerRow, ...dataRows].join('\n');

  // UTF-8 BOMを追加（Excelで日本語が正しく表示されるように）
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

/**
 * CSVファイルをダウンロード
 * @param csvContent CSV文字列
 * @param filename ファイル名（拡張子なし）
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Blobを作成（UTF-8エンコーディング）
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // ダウンロードリンクを作成
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  // ダウンロード実行
  document.body.appendChild(link);
  link.click();

  // クリーンアップ
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ファイル名を生成（日時を含む）
 * @param prefix プレフィックス（例: 'merchants'）
 * @returns ファイル名（拡張子なし）
 */
export function generateFilename(prefix: string = 'merchants'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// 店舗データの型（一覧表示用）
export type ShopForCSV = {
  merchantName?: string;
  name: string;
  nameKana?: string;
  postalCode?: string;
  address?: string;
  accountEmail?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * 店舗ステータスのラベルを取得
 */
function getShopStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'registering': '登録中',
    'collection_requested': '資料収集中',
    'approval_pending': '承認待ち',
    'promotional_materials_preparing': '広報資料準備中',
    'promotional_materials_shipping': '広報資料発送中',
    'operating': '運用中',
    'suspended': '停止中',
    'terminated': '終了',
  };
  return statusLabels[status] || status;
}

/**
 * 店舗データをCSV形式に変換
 */
export function convertShopsToCSV(
  shops: ShopForCSV[],
  includeMerchantName: boolean = false
): string {
  const headers: string[] = [];

  if (includeMerchantName) {
    headers.push('事業者名');
  }
  headers.push(
    '店舗名',
    '店舗名（カナ）',
    '郵便番号',
    '住所',
    'メールアドレス',
    '電話番号',
    '承認ステータス',
    '登録日時',
    '更新日時'
  );

  const headerRow = headers.map(escapeCSVValue).join(',');

  const dataRows = shops.map((shop) => {
    const values: string[] = [];

    if (includeMerchantName) {
      values.push(escapeCSVValue(shop.merchantName || ''));
    }
    values.push(
      escapeCSVValue(shop.name || ''),
      escapeCSVValue(shop.nameKana || ''),
      escapeCSVValue(shop.postalCode || ''),
      escapeCSVValue(shop.address || ''),
      escapeCSVValue(shop.accountEmail || ''),
      escapeCSVValue(shop.phone || ''),
      escapeCSVValue(getShopStatusLabel(shop.status)),
      escapeCSVValue(formatDate(shop.createdAt)),
      escapeCSVValue(formatDate(shop.updatedAt))
    );

    return values.join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

// クーポンデータの型（一覧表示用）
export type CouponForCSV = {
  merchantName?: string;
  shopName?: string;
  title: string;
  status: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * クーポンステータスのラベルを取得
 */
function getCouponStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return '申請中';
    case 'approved': return '承認済み';
    case 'suspended': return '停止中';
    default: return status;
  }
}

/**
 * クーポンデータをCSV形式に変換
 */
export function convertCouponsToCSV(
  coupons: CouponForCSV[],
  includeMerchantName: boolean = false
): string {
  const headers: string[] = [];

  if (includeMerchantName) {
    headers.push('事業者名');
  }
  headers.push(
    '店舗名',
    'クーポン名',
    '承認ステータス',
    '公開ステータス',
    '作成日時',
    '更新日時'
  );

  const headerRow = headers.map(escapeCSVValue).join(',');

  const dataRows = coupons.map((coupon) => {
    const values: string[] = [];

    if (includeMerchantName) {
      values.push(escapeCSVValue(coupon.merchantName || ''));
    }
    values.push(
      escapeCSVValue(coupon.shopName || ''),
      escapeCSVValue(coupon.title || ''),
      escapeCSVValue(getCouponStatusLabel(coupon.status)),
      escapeCSVValue(coupon.isPublic ? '公開中' : '非公開'),
      escapeCSVValue(formatDate(coupon.createdAt)),
      escapeCSVValue(formatDate(coupon.updatedAt))
    );

    return values.join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

// ユーザーデータの型（一覧表示用）
export type UserForCSV = {
  nickname: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  birthDate?: string;
  gender?: number;
  saitamaAppId?: string;
  rank: number;
  registeredAt: string;
};

/**
 * 性別のラベルを取得
 */
function getGenderLabel(gender: number): string {
  switch (gender) {
    case 1: return '男性';
    case 2: return '女性';
    case 3: return '未回答';
    default: return '未回答';
  }
}

/**
 * ランクのラベルを取得
 */
function getRankLabel(rank: number): string {
  switch (rank) {
    case 1: return 'ブロンズ';
    case 2: return 'シルバー';
    case 3: return 'ゴールド';
    case 4: return 'ダイヤモンド';
    default: return 'ブロンズ';
  }
}

/**
 * ユーザーデータをCSV形式に変換
 * @param users ユーザーデータ配列
 * @param isOperatorRole operatorロールかどうか
 */
export function convertUsersToCSV(
  users: UserForCSV[],
  isOperatorRole: boolean = false
): string {
  const headers: string[] = [];

  if (isOperatorRole) {
    headers.push('ニックネーム', 'ランク', '登録日');
  } else {
    headers.push(
      'ニックネーム',
      '郵便番号',
      '都道府県',
      '市区町村',
      '住所',
      '生年月日',
      '性別',
      'さいこいんアプリID',
      'ランク',
      '登録日'
    );
  }

  const headerRow = headers.map(escapeCSVValue).join(',');

  const dataRows = users.map((user) => {
    const values: string[] = [];

    if (isOperatorRole) {
      values.push(
        escapeCSVValue(user.nickname || ''),
        escapeCSVValue(getRankLabel(user.rank)),
        escapeCSVValue(formatDate(user.registeredAt))
      );
    } else {
      values.push(
        escapeCSVValue(user.nickname || ''),
        escapeCSVValue(user.postalCode || ''),
        escapeCSVValue(user.prefecture || ''),
        escapeCSVValue(user.city || ''),
        escapeCSVValue(user.address || ''),
        escapeCSVValue(user.birthDate || ''),
        escapeCSVValue(getGenderLabel(user.gender || 3)),
        escapeCSVValue(user.saitamaAppId || ''),
        escapeCSVValue(getRankLabel(user.rank)),
        escapeCSVValue(formatDate(user.registeredAt))
      );
    }

    return values.join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

// クーポン利用履歴データの型（一覧表示用）
export type CouponUsageForCSV = {
  id: string;
  couponId?: string;
  couponName?: string;
  shopName: string;
  email?: string;
  nickname?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  usedAt: string;
};

/**
 * クーポン利用履歴データをCSV形式に変換
 * @param usages クーポン利用履歴データ配列
 * @param isSysAdmin sysadmin権限かどうか
 * @param includeCouponInfo クーポン情報を含めるかどうか
 */
export function convertCouponUsagesToCSV(
  usages: CouponUsageForCSV[],
  isSysAdmin: boolean = false,
  includeCouponInfo: boolean = true
): string {
  const headers: string[] = [];

  headers.push('クーポン利用ID');

  if (includeCouponInfo) {
    headers.push('クーポンID', 'クーポン名');
  }

  headers.push('店舗名');

  if (isSysAdmin) {
    headers.push('メールアドレス', 'ニックネーム', '性別', '生年月日', '住所');
  }

  headers.push('利用日時');

  const headerRow = headers.map(escapeCSVValue).join(',');

  const dataRows = usages.map((usage) => {
    const values: string[] = [];

    values.push(escapeCSVValue(usage.id));

    if (includeCouponInfo) {
      values.push(
        escapeCSVValue(usage.couponId || ''),
        escapeCSVValue(usage.couponName || '')
      );
    }

    values.push(escapeCSVValue(usage.shopName || ''));

    if (isSysAdmin) {
      const genderLabel = usage.gender === 'male' ? '男性' : usage.gender === 'female' ? '女性' : usage.gender === 'other' ? 'その他' : '未回答';
      values.push(
        escapeCSVValue(usage.email || ''),
        escapeCSVValue(usage.nickname || ''),
        escapeCSVValue(genderLabel),
        escapeCSVValue(usage.birthDate || ''),
        escapeCSVValue(usage.address || '')
      );
    }

    values.push(escapeCSVValue(formatDate(usage.usedAt)));

    return values.join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

