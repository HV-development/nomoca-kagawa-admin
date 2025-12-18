'use client';

import dynamicImport from 'next/dynamic';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/templates/admin-layout';

const ShopForm = dynamicImport(() => import('@/components/organisms/ShopForm'), {
  loading: () => <div className="flex items-center justify-center p-8">読み込み中...</div>,
  ssr: false,
});

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

export default function NewShopPage() {
  const params = useParams();
  const id = params.id as string;
  return (
    <AdminLayout>
      <ShopForm merchantId={id} />
    </AdminLayout>
  );
}

