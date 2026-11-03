import type { ShopSearchFormData } from '@/components/organisms/ShopSearchForm';

type ShopDateRange = Pick<ShopSearchFormData, 'createdAtFrom' | 'createdAtTo' | 'updatedAtFrom' | 'updatedAtTo'>;

// 画面の項目名（URL のクエリ名も同じ）と、店舗一覧 API（GET /shops）が読むクエリ名は異なる
export function appendShopDateRangeParams(queryParams: URLSearchParams, form: ShopDateRange): void {
  if (form.createdAtFrom) queryParams.append('createdFrom', form.createdAtFrom);
  if (form.createdAtTo) queryParams.append('createdTo', form.createdAtTo);
  if (form.updatedAtFrom) queryParams.append('updatedFrom', form.updatedAtFrom);
  if (form.updatedAtTo) queryParams.append('updatedTo', form.updatedAtTo);
}
