/**
 * テストデータファクトリー
 * E2Eテスト用のダミーデータを生成する
 */

// ユニークなIDを生成するカウンター
let idCounter = 0;

/**
 * ユニークなIDを生成する
 */
function generateId(prefix: string = 'test'): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * ランダムな文字列を生成する
 */
function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * ランダムなメールアドレスを生成する
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * ランダムな電話番号を生成する
 */
export function randomPhoneNumber(): string {
  return `090${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}

// ============================================
// マーチャント（事業者）データ
// ============================================

export interface MerchantInput {
  name: string;
  email: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  representativeName: string;
  description?: string;
}

/**
 * テスト用マーチャントデータを生成する
 */
export function createMerchantData(overrides?: Partial<MerchantInput>): MerchantInput {
  return {
    name: `テスト事業者_${randomString(4)}`,
    email: randomEmail(),
    phoneNumber: randomPhoneNumber(),
    postalCode: '760-0001',
    prefecture: '香川県',
    city: '高松市',
    address: `中央町${Math.floor(Math.random() * 100) + 1}-${Math.floor(Math.random() * 10) + 1}`,
    representativeName: `代表者_${randomString(4)}`,
    description: 'E2Eテスト用の事業者です',
    ...overrides,
  };
}

// ============================================
// 店舗データ
// ============================================

export interface ShopInput {
  name: string;
  email: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address: string;
  description?: string;
  businessHours?: string;
  regularHoliday?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * テスト用店舗データを生成する
 */
export function createShopData(overrides?: Partial<ShopInput>): ShopInput {
  return {
    name: `テスト店舗_${randomString(4)}`,
    email: randomEmail(),
    phoneNumber: randomPhoneNumber(),
    postalCode: '760-0002',
    prefecture: '香川県',
    city: '高松市',
    address: `栗林町${Math.floor(Math.random() * 100) + 1}-${Math.floor(Math.random() * 10) + 1}`,
    description: 'E2Eテスト用の店舗です',
    businessHours: '10:00-22:00',
    regularHoliday: '月曜日',
    latitude: 34.3167 + Math.random() * 0.01,
    longitude: 134.0500 + Math.random() * 0.01,
    ...overrides,
  };
}

// ============================================
// クーポンデータ
// ============================================

export interface CouponInput {
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  minPurchaseAmount?: number;
  isPublished?: boolean;
}

/**
 * テスト用クーポンデータを生成する
 */
export function createCouponData(overrides?: Partial<CouponInput>): CouponInput {
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    title: `テストクーポン_${randomString(4)}`,
    description: 'E2Eテスト用のクーポンです。ご利用ありがとうございます。',
    discountType: 'percentage',
    discountValue: 10,
    startDate,
    endDate,
    usageLimit: 100,
    usageLimitPerUser: 1,
    minPurchaseAmount: 1000,
    isPublished: true,
    ...overrides,
  };
}

// ============================================
// ユーザーデータ
// ============================================

export interface UserInput {
  nickname: string;
  email: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  birthDate?: string;
  gender?: 1 | 2 | 3; // 1: 男性, 2: 女性, 3: その他
}

/**
 * テスト用ユーザーデータを生成する
 */
export function createUserData(overrides?: Partial<UserInput>): UserInput {
  return {
    nickname: `テストユーザー_${randomString(4)}`,
    email: randomEmail(),
    postalCode: '760-0003',
    prefecture: '香川県',
    city: '高松市',
    address: `番町${Math.floor(Math.random() * 10) + 1}丁目`,
    birthDate: '1990-01-01',
    gender: 1,
    ...overrides,
  };
}

// ============================================
// 管理者データ
// ============================================

export interface AdminInput {
  email: string;
  password: string;
  role: 'sysadmin' | 'operator';
  name?: string;
}

/**
 * テスト用管理者データを生成する
 */
export function createAdminData(overrides?: Partial<AdminInput>): AdminInput {
  return {
    email: randomEmail(),
    password: 'TestPassword123!',
    role: 'operator',
    name: `管理者_${randomString(4)}`,
    ...overrides,
  };
}

// ============================================
// モックレスポンスデータ
// ============================================

/**
 * ページネーション付きレスポンスを生成する
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  limit: number = 10,
  total?: number
): {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} {
  const actualTotal = total ?? items.length;
  return {
    items,
    pagination: {
      page,
      limit,
      total: actualTotal,
      totalPages: Math.ceil(actualTotal / limit),
    },
  };
}

/**
 * マーチャント一覧のモックレスポンスを生成する
 */
export function createMerchantListResponse(count: number = 5) {
  const merchants = Array.from({ length: count }, (_, i) => ({
    id: generateId('merchant'),
    ...createMerchantData(),
    status: i % 2 === 0 ? 'approved' : 'pending',
    createdAt: new Date().toISOString(),
  }));
  return createPaginatedResponse(merchants);
}

/**
 * 店舗一覧のモックレスポンスを生成する
 */
export function createShopListResponse(count: number = 5) {
  const shops = Array.from({ length: count }, (_, i) => ({
    id: generateId('shop'),
    ...createShopData(),
    status: i % 2 === 0 ? 'published' : 'draft',
    createdAt: new Date().toISOString(),
  }));
  return createPaginatedResponse(shops);
}

/**
 * クーポン一覧のモックレスポンスを生成する
 */
export function createCouponListResponse(count: number = 5) {
  const coupons = Array.from({ length: count }, () => ({
    id: generateId('coupon'),
    ...createCouponData(),
    usedCount: Math.floor(Math.random() * 50),
    createdAt: new Date().toISOString(),
  }));
  return createPaginatedResponse(coupons);
}

/**
 * ユーザー一覧のモックレスポンスを生成する
 */
export function createUserListResponse(count: number = 5) {
  const users = Array.from({ length: count }, () => ({
    id: generateId('user'),
    ...createUserData(),
    rank: Math.floor(Math.random() * 5) + 1,
    registeredAt: new Date().toISOString(),
  }));
  return createPaginatedResponse(users);
}

/**
 * 管理者一覧のモックレスポンスを生成する
 */
export function createAdminListResponse(count: number = 3) {
  const admins = Array.from({ length: count }, (_, i) => ({
    id: generateId('admin'),
    ...createAdminData({ role: i === 0 ? 'sysadmin' : 'operator' }),
    createdAt: new Date().toISOString(),
  }));
  return createPaginatedResponse(admins);
}




