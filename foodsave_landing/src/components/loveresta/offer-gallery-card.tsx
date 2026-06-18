import { Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Offer } from '@/lib/loveresta-data';
import { formatKztPrice } from '@/lib/utils';

export function OfferGalleryCard({ offer }: { offer: Offer }) {
  return (
    <article className="loveresta-offer-gallery-card">
      <Link
        aria-label={`Открыть ${offer.title}`}
        className="loveresta-offer-gallery-card__media"
        href={`/checkout?offer=${offer.id}`}
      >
        <Image
          alt={offer.title}
          className="loveresta-offer-gallery-card__image"
          fill
          sizes="(max-width: 820px) 50vw, (max-width: 1200px) 33vw, 20vw"
          src={offer.image}
        />
        <div className="loveresta-offer-gallery-card__overlay">
          <span className="loveresta-offer-gallery-card__pill">{offer.boxLabel}</span>
          <span className="loveresta-offer-gallery-card__heart" aria-hidden="true">
            <Heart size={20} strokeWidth={2} />
          </span>
        </div>
        <span
          className={`loveresta-offer-gallery-card__brand loveresta-offer-gallery-card__brand--${offer.brandTone}`}
        >
          {offer.brandLabel}
        </span>
      </Link>

      <div className="loveresta-offer-gallery-card__body">
        <h3 className="loveresta-offer-gallery-card__title">{offer.title}</h3>
        <div className="loveresta-offer-gallery-card__price">
          <span>{formatKztPrice(offer.oldPrice)}</span>
          <strong>{formatKztPrice(offer.price)}</strong>
        </div>
      </div>
    </article>
  );
}
