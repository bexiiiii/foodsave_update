import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { VenueDetailPage } from '@/components/loveresta/ui';
import { fetchStore, fetchProductsByStore } from '@/lib/api';
import type { Venue, Offer } from '@/lib/loveresta-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await fetchStore(id);
  if (!store) return { title: 'Заведение не найдено' };
  return {
    title: store.name,
    description: `${store.name} — покупайте сюрприз-боксы со скидкой 50–70%. Самовывоз: ${store.address}`,
    alternates: { canonical: `https://foodsave.kz/restaurant/${id}` },
  };
}

export default async function RestaurantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [store, products] = await Promise.all([
    fetchStore(id),
    fetchProductsByStore(id),
  ]);

  if (!store) notFound();

  const pickupWindow =
    store.openingHours && store.closingHours
      ? `${store.openingHours} – ${store.closingHours}`
      : 'Уточните у заведения';

  const venue: Venue = {
    id: String(store.id),
    kind: 'restaurant',
    name: store.name,
    logo: store.logo ?? undefined,
    summary: store.description || store.name,
    address: store.address,
    rating: '4.8',
    pickupWindow,
    priceHint: 'от 1 400 ₸',
    tags: [],
    description: store.description || '',
  };

  const offers: Offer[] = products.map((p) => ({
    id: String(p.id),
    venueId: String(p.storeId),
    title: p.name,
    description: p.description || '',
    price: p.price,
    oldPrice: p.originalPrice ?? p.price,
    pickup: p.storeAddress,
    category: p.categoryName,
    accent: p.discountPercentage ? `-${Math.round(p.discountPercentage)}%` : 'Скидка',
    image: p.imageUrl || p.images?.[0] || '',
    boxLabel: p.stockQuantity > 0 ? `${p.stockQuantity} шт` : 'Уточните',
    brandLabel: p.storeName,
    brandTone: 'dark',
  }));

  return <VenueDetailPage offers={offers} venue={venue} />;
}
