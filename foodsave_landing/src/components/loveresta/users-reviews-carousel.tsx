'use client';

import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { UserReview } from '@/lib/loveresta-data';

function getVenueMark(venue: string) {
  return venue
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UsersReviewsCarousel({ reviews }: { reviews: UserReview[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(reviews.length > 1);

  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    const target = slideRefs.current[index];

    if (!viewport || !target) {
      return;
    }

    const maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

    viewport.scrollTo({
      left: Math.min(target.offsetLeft, maxLeft),
      behavior,
    });
  };

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const syncState = () => {
      const slides = slideRefs.current.filter(Boolean) as HTMLElement[];

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

      const maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      setActiveIndex(nearestIndex);
      setCanScrollPrev(viewport.scrollLeft > 8 || nearestIndex > 0);
      setCanScrollNext(viewport.scrollLeft < maxLeft - 8 || nearestIndex < slides.length - 1);
    };

    const initialize = () => syncState();

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(initialize);
    });

    const resizeObserver = new ResizeObserver(initialize);
    resizeObserver.observe(viewport);
    viewport.addEventListener('scroll', syncState, { passive: true });
    window.addEventListener('resize', syncState);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', syncState);
      window.removeEventListener('resize', syncState);
    };
  }, []);

  return (
    <div className="loveresta-user-reviews">
      <div className="loveresta-user-reviews__viewportWrap">
        <div ref={viewportRef} className="loveresta-user-reviews__viewport">
          <div className="loveresta-user-reviews__track">
            {reviews.map((review, index) => (
              <article
                key={review.name + review.date}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className="loveresta-user-reviews__slide"
              >
                <div className="loveresta-user-reviews__top">
                  <div className="loveresta-user-reviews__meta">
                    <strong>{review.name}</strong>
                    <span>{review.date}</span>
                  </div>

                  <div className="loveresta-user-reviews__badges">
                    <span className="loveresta-user-reviews__venue">{getVenueMark(review.venue)}</span>
                    <span className="loveresta-user-reviews__rating">
                      <Star size={15} fill="currentColor" strokeWidth={2} />
                      {review.rating}
                    </span>
                  </div>
                </div>

                <p>{review.body}</p>
              </article>
            ))}
          </div>
        </div>

        {canScrollPrev ? (
          <button
            aria-label="Предыдущий отзыв"
            className="loveresta-user-reviews__nav loveresta-user-reviews__nav--prev"
            onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
            type="button"
          >
            <ArrowLeft size={24} strokeWidth={2.1} />
          </button>
        ) : null}

        {canScrollNext ? (
          <button
            aria-label="Следующий отзыв"
            className="loveresta-user-reviews__nav loveresta-user-reviews__nav--next"
            onClick={() => scrollToIndex(Math.min(activeIndex + 1, reviews.length - 1))}
            type="button"
          >
            <ArrowRight size={24} strokeWidth={2.1} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
