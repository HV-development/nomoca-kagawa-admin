'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

export default function ShopCouponsRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  const shopId = params?.id;
  const searchParamsString = searchParams?.toString() ?? '';

  useEffect(() => {
    if (!shopId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set('shopId', shopId);

    const queryString = nextParams.toString();
    router.replace(queryString ? `/coupons?${queryString}` : '/coupons');
  }, [router, shopId, searchParamsString]);

  return null;
}


