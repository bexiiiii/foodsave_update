'use client';

import {
  AlertTriangle,
  ChevronDown,
  Clock3,
  MapPin,
  Share2,
  Star,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import type { Offer, Venue } from '@/lib/loveresta-data';
import { formatKztPrice } from '@/lib/utils';

function TelegramIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M16.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

export function RecommendedOffersGallery({
  offers,
  venues,
}: {
  offers: Offer[];
  venues: Venue[];
}) {
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const activeOffer = offers.find((offer) => offer.id === activeOfferId) ?? null;
  const activeVenue = activeOffer ? venues.find((venue) => venue.id === activeOffer.venueId) ?? null : null;

  useEffect(() => {
    if (!activeOffer) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveOfferId(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOffer]);

  return (
    <>
      <div className="loveresta-offer-gallery-grid">
        {offers.map((offer) => (
          <article key={offer.id} className="loveresta-offer-gallery-card">
            <button
              aria-label={`Открыть ${offer.title}`}
              className="loveresta-offer-gallery-card__trigger"
              onClick={() => setActiveOfferId(offer.id)}
              type="button"
            >
              <div className="loveresta-offer-gallery-card__media">
                <Image
                  alt={offer.title}
                  className="loveresta-offer-gallery-card__image"
                  fill
                  sizes="(max-width: 820px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  src={offer.image}
                />
                <div className="loveresta-offer-gallery-card__overlay">
                  <span className="loveresta-offer-gallery-card__pill">{offer.boxLabel}</span>
                </div>
                <span
                  className={`loveresta-offer-gallery-card__brand loveresta-offer-gallery-card__brand--${offer.brandTone}`}
                >
                  {offer.brandLabel}
                </span>
              </div>

              <div className="loveresta-offer-gallery-card__body">
                <h3 className="loveresta-offer-gallery-card__title">{offer.title}</h3>
                <div className="loveresta-offer-gallery-card__price">
                  <span>{formatKztPrice(offer.oldPrice)}</span>
                  <strong>{formatKztPrice(offer.price)}</strong>
                </div>
              </div>
            </button>
          </article>
        ))}
      </div>

      {activeOffer && activeVenue ? (
        <div
          aria-modal="true"
          className="loveresta-offer-modal"
          onClick={() => setActiveOfferId(null)}
          role="dialog"
        >
          <div className="loveresta-offer-modal__panel" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Закрыть окно"
              className="loveresta-offer-modal__close"
              onClick={() => setActiveOfferId(null)}
              type="button"
            >
              <X size={26} strokeWidth={2.1} />
            </button>

            <div className="loveresta-offer-modal__media">
              <Image
                alt={activeOffer.title}
                className="loveresta-offer-modal__image"
                fill
                sizes="(max-width: 900px) 100vw, 46vw"
                src={activeOffer.image}
              />
            </div>

            <div className="loveresta-offer-modal__content">
              <div className="loveresta-offer-modal__header">
                <h3>{activeOffer.title}</h3>
                <p>{activeOffer.description}</p>
              </div>

              <div className="loveresta-offer-modal__venueCard">
                <div className="loveresta-offer-modal__venueMark">
                  <span>{activeOffer.brandLabel}</span>
                </div>

                <div className="loveresta-offer-modal__venueBody">
                  <div className="loveresta-offer-modal__addressBox">
                    <div>
                      <span className="loveresta-offer-modal__addressLabel">
                        <MapPin size={15} strokeWidth={2.1} />
                        Адрес самовывоза
                      </span>
                      <strong>{activeVenue.address}</strong>
                    </div>
                    <ChevronDown size={18} strokeWidth={2.2} />
                  </div>

                  <div className="loveresta-offer-modal__meta">
                    <span>
                      <Star size={15} fill="currentColor" strokeWidth={2} />
                      {activeVenue.rating}
                    </span>
                    <span>
                      <Clock3 size={15} strokeWidth={2.1} />
                      {activeVenue.pickupWindow}
                    </span>
                    <button aria-label="Поделиться" type="button">
                      <Share2 size={17} strokeWidth={2.1} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="loveresta-offer-modal__alert">
                <AlertTriangle size={22} strokeWidth={2.1} />
                <div>
                  <span>Заказ необходимо забрать до:</span>
                  <strong>{activeVenue.pickupWindow}</strong>
                </div>
              </div>

              <div className="loveresta-offer-modal__purchase">
                <div className="loveresta-offer-modal__stock">{activeOffer.boxLabel} в наличии</div>

                <a
                  className="loveresta-offer-modal__checkout loveresta-offer-modal__checkout--telegram"
                  href="https://t.me/FoodSave_bot"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="loveresta-offer-modal__checkoutIcon loveresta-offer-modal__checkoutIcon--telegram">
                    <TelegramIcon className="loveresta-offer-modal__telegramIcon" />
                  </span>
                  <span className="loveresta-offer-modal__checkoutLabel">
                    Заказать через Telegram Mini App
                  </span>
                </a>
              </div>

              <div className="loveresta-offer-modal__note">
                <AlertTriangle size={18} strokeWidth={2} />
                <p>
                  Важно: точный состав бокса зависит от наличия в заведении. Если у вас
                  есть аллергии или ограничения по продуктам, уточняйте детали перед
                  оформлением заказа.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
