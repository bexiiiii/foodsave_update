import { CheckoutPage } from '@/components/loveresta/ui';
import { getOffersForVenue, venues } from '@/lib/loveresta-data';

export default function CheckoutRoute() {
  const venue = venues[0];
  const selectedOffers = getOffersForVenue(venue.id).slice(0, 2);

  return <CheckoutPage selectedOffers={selectedOffers} venue={venue} />;
}
