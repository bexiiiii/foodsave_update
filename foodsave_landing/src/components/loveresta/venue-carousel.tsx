'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Venue } from '@/lib/loveresta-data';

import { VenueCard } from './venue-card';

export function VenueCarousel({ venues }: { venues: Venue[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const syncState = () => {
      const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[];

      if (!slides.length) {
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - viewport.scrollLeft);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveIndex(nearestIndex);
      setCanScrollNext(nearestIndex < slides.length - 1);
    };

    syncState();
    viewport.addEventListener('scroll', syncState, { passive: true });
    window.addEventListener('resize', syncState);

    return () => {
      viewport.removeEventListener('scroll', syncState);
      window.removeEventListener('resize', syncState);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const viewport = viewportRef.current;
    const target = slideRefs.current[index];

    if (!viewport || !target) {
      return;
    }

    viewport.scrollTo({
      left: target.offsetLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="loveresta-carousel">
      <div ref={viewportRef} className="loveresta-carousel__viewport">
        <div className="loveresta-carousel__track">
          {venues.map((venue, index) => (
            <div
              key={venue.kind + venue.id}
              ref={(node) => {
                slideRefs.current[index] = node;
              }}
              className="loveresta-carousel__slide"
            >
              <VenueCard venue={venue} index={index} />
            </div>
          ))}
        </div>
      </div>

      {canScrollNext ? (
        <button
          aria-label="Следующее заведение"
          className="loveresta-carousel__next"
          onClick={() => scrollToIndex(Math.min(activeIndex + 1, venues.length - 1))}
          type="button"
        >
          <ArrowRight size={28} strokeWidth={2.2} />
        </button>
      ) : null}

      <div className="loveresta-carousel__dots" aria-label="Позиция в карусели">
        {venues.map((venue, index) => (
          <button
            key={venue.id}
            aria-label={`Перейти к карточке ${venue.name}`}
            className={`loveresta-carousel__dot ${
              index === activeIndex ? 'loveresta-carousel__dot--active' : ''
            }`}
            onClick={() => scrollToIndex(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
