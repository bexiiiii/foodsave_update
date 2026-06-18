import { notFound } from 'next/navigation';

import { OrderDetailsPage } from '@/components/loveresta/ui';
import { demoOrders, getOrder, getVenue } from '@/lib/loveresta-data';

export function generateStaticParams() {
  return demoOrders.map((order) => ({ id: order.id }));
}

export default async function OrderDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(id);

  if (!order) {
    notFound();
  }

  const venue = getVenue(order.venueId);

  if (!venue) {
    notFound();
  }

  return <OrderDetailsPage order={order} venue={venue} />;
}
