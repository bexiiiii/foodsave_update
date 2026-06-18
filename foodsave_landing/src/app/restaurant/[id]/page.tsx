import { notFound } from 'next/navigation';

import { VenueDetailPage } from '@/components/loveresta/ui';
import { getOffersForVenue, getVenue, venues } from '@/lib/loveresta-data';

export function generateStaticParams() {
  return venues.filter((venue) => venue.kind === 'restaurant').map((venue) => ({ id: venue.id }));
}

export default async function RestaurantDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = getVenue(id);

  if (!venue || venue.kind !== 'restaurant') {
    notFound();
  }

  return <VenueDetailPage offers={getOffersForVenue(venue.id)} venue={venue} />;
}
