'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { UserBenefit } from '@/lib/loveresta-data';

export function UsersBenefitsCarousel({ benefits }: { benefits: UserBenefit[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(benefits.length > 1);

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
    <div className="loveresta-user-benefits">
      <div className="loveresta-user-benefits__copy">
        <span className="loveresta-user-benefits__eyebrow">Преимущества для гостей</span>
        <h2 className="loveresta-user-benefits__title">
          Хотите вкусно поесть и при этом сэкономить?
        </h2>
        <p className="loveresta-user-benefits__text">
          FOODSAVE показывает готовые боксы рядом с вами и помогает забрать качественную
          еду по сниженной цене без лишних шагов.
        </p>
      </div>

      <div className="loveresta-user-benefits__rail">
        <div ref={viewportRef} className="loveresta-user-benefits__viewport">
          <div className="loveresta-user-benefits__track">
            {benefits.map((benefit, index) => (
              <article
                key={benefit.number + benefit.title}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className={`loveresta-user-benefits__slide ${
                  activeIndex === index ? 'loveresta-user-benefits__slide--active' : ''
                }`}
              >
                <span className="loveresta-user-benefits__number">{benefit.number}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>

        {canScrollPrev ? (
          <button
            aria-label="Предыдущая карточка"
            className="loveresta-user-benefits__nav loveresta-user-benefits__nav--prev"
            onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
            type="button"
          >
            <ArrowLeft size={24} strokeWidth={2.1} />
          </button>
        ) : null}

        {canScrollNext ? (
          <button
            aria-label="Следующая карточка"
            className="loveresta-user-benefits__nav loveresta-user-benefits__nav--next"
            onClick={() => scrollToIndex(Math.min(activeIndex + 1, benefits.length - 1))}
            type="button"
          >
            <ArrowRight size={24} strokeWidth={2.1} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
