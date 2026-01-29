import type { ShopCreateRequest } from '@hv-development/schemas';

export interface Merchant {
  id: string;
  name: string;
  nameKana?: string;
  representativeNameLast?: string;
  representativeNameFirst?: string;
  representativeNameLastKana?: string;
  representativeNameFirstKana?: string;
  email?: string;
  phone?: string;
  representativePhone?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string | null;
  businessType?: string;
  businessDescription?: string;
  website?: string | null;
  accountId?: string;
  accountEmail?: string;
  applications?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  account: {
    email: string;
    displayName?: string | null;
    status?: string;
    lastLoginAt?: Date;
  };
  shops?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface ShopDataResponse extends Omit<ShopCreateRequest, 'services'> {
  accountEmail?: string;
  merchant?: {
    id: string;
    name: string;
    nameKana?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string | null;
    account?: {
      email: string;
    };
  };
  images?: string[];
  latitude?: string | number;
  longitude?: string | number;
  paymentMydigi?: boolean;
  paymentApps?: Record<string, boolean>;
  area?: string;
  services?: Record<string, boolean> | null; // サービス情報（paymentAppsと同じ形式）
}

export interface Genre {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Scene {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ImagePreview {
  file: File;
  url: string;
}

export type ExtendedShopCreateRequest = Omit<ShopCreateRequest, 'services'> & {
  homepageUrl?: string | null;
  couponUsageStart?: string | null;
  couponUsageEnd?: string | null;
  couponUsageDays?: string | null;
  services?: Record<string, boolean> | null; // サービス情報（paymentAppsと同じ形式）
  paymentMydigi?: boolean;
  paymentApps?: Record<string, boolean>;
  area?: string;
  confirmPassword?: string; // パスワード確認用
};



