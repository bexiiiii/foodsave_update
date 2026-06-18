'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { BrandLogo } from '@/components/loveresta/brand-logo';
import type { UserJourneyStep } from '@/lib/loveresta-data';

function UserJourneyVisual({ visual }: { visual: UserJourneyStep['visual'] }) {
  switch (visual) {
    case 'catalog':
      return (
        <div className="loveresta-user-journey-card__scene loveresta-user-journey-card__scene--catalog">
          <div className="loveresta-user-phone">
            <div className="loveresta-user-phone__screen">
              <div className="loveresta-user-phone__status" />
              <div className="loveresta-user-phone__venue" />
              <div className="loveresta-user-phone__card" />
              <div className="loveresta-user-phone__card loveresta-user-phone__card--short" />
              <div className="loveresta-user-phone__price" />
            </div>
          </div>
          <div className="loveresta-user-float-card">
            <div className="loveresta-user-float-card__thumb" />
            <div className="loveresta-user-float-card__line" />
            <div className="loveresta-user-float-card__line loveresta-user-float-card__line--short" />
          </div>
        </div>
      );
    case 'select':
      return (
        <div className="loveresta-user-journey-card__scene loveresta-user-journey-card__scene--select">
          <div className="loveresta-user-phone">
            <div className="loveresta-user-phone__screen">
              <div className="loveresta-user-phone__status" />
              <div className="loveresta-user-box-preview">
                <div className="loveresta-user-box-preview__lid" />
                <div className="loveresta-user-box-preview__body">
                  <div className="loveresta-user-box-preview__logoWrap">
                    <BrandLogo className="loveresta-user-box-preview__logo" />
                  </div>
                </div>
              </div>
              <div className="loveresta-user-phone__text" />
              <div className="loveresta-user-phone__text loveresta-user-phone__text--short" />
              <div className="loveresta-user-phone__price" />
            </div>
          </div>
          <div className="loveresta-user-bag">
            <span />
            <span />
            <span />
          </div>
        </div>
      );
    case 'checkout':
      return (
        <div className="loveresta-user-journey-card__scene loveresta-user-journey-card__scene--checkout">
          <div className="loveresta-user-phone">
            <div className="loveresta-user-phone__screen">
              <div className="loveresta-user-phone__status" />
              <div className="loveresta-user-phone__field" />
              <div className="loveresta-user-phone__field" />
              <div className="loveresta-user-phone__field" />
              <div className="loveresta-user-phone__button" />
            </div>
          </div>
          <div className="loveresta-user-note">
            <div className="loveresta-user-note__icon" />
            <div className="loveresta-user-note__copy">
              <span />
              <span />
            </div>
          </div>
          <div className="loveresta-user-cup" />
        </div>
      );
    case 'pickup':
      return (
        <div className="loveresta-user-journey-card__scene loveresta-user-journey-card__scene--pickup">
          <div className="loveresta-user-box-open">
            <div className="loveresta-user-box-open__lid" />
            <div className="loveresta-user-box-open__body">
              <span className="loveresta-user-box-open__food loveresta-user-box-open__food--1" />
              <span className="loveresta-user-box-open__food loveresta-user-box-open__food--2" />
              <span className="loveresta-user-box-open__food loveresta-user-box-open__food--3" />
              <span className="loveresta-user-box-open__food loveresta-user-box-open__food--4" />
            </div>
          </div>
          <div className="loveresta-user-plate">
            <span className="loveresta-user-plate__food loveresta-user-plate__food--1" />
            <span className="loveresta-user-plate__food loveresta-user-plate__food--2" />
            <span className="loveresta-user-plate__food loveresta-user-plate__food--3" />
          </div>
        </div>
      );
  }
}

export function UsersJourneyShowcase({ steps }: { steps: UserJourneyStep[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(steps.length > 1);

  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    const target = slideRefs.current[index];

    if (!viewport || !target) {
      return;
    }

    viewport.scrollTo({
      left: target.offsetLeft,
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

      setActiveIndex(nearestIndex);
      setCanScrollPrev(nearestIndex > 0);
      setCanScrollNext(nearestIndex < slides.length - 1);
    };

    const initialize = () => {
      viewport.scrollTo({ left: 0, behavior: 'auto' });
      syncState();
    };

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
    <div className="loveresta-user-journey">
      <div className="loveresta-user-journey__viewportWrap">
        <div ref={viewportRef} className="loveresta-user-journey__viewport">
          <div className="loveresta-user-journey__track">
            {steps.map((step, index) => (
              <article
                key={step.step}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className="loveresta-user-journey__slide"
              >
                <div className="loveresta-user-journey-card">
                  <span className="loveresta-user-journey-card__pill">Шаг {step.step}</span>
                  <h3 className="loveresta-user-journey-card__title">{step.title}</h3>

                  <div className="loveresta-user-journey-card__progress" aria-hidden="true">
                    {steps.map((item, progressIndex) => (
                      <div key={item.step} className="loveresta-user-journey-card__progressItem">
                        <span
                          className={`loveresta-user-journey-card__dot ${
                            progressIndex < step.step
                              ? 'loveresta-user-journey-card__dot--filled'
                              : ''
                          }`}
                        >
                          {progressIndex < step.step - 1 ? <Check size={11} strokeWidth={3} /> : null}
                        </span>
                        {progressIndex < steps.length - 1 ? (
                          <span
                            className={`loveresta-user-journey-card__line ${
                              progressIndex < step.step - 1
                                ? 'loveresta-user-journey-card__line--filled'
                                : ''
                            }`}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <UserJourneyVisual visual={step.visual} />
                </div>

                <div className="loveresta-user-journey__caption">
                  <strong>Шаг {step.step}</strong>
                  <p>{step.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {canScrollPrev ? (
          <button
            aria-label="Предыдущий шаг"
            className="loveresta-user-journey__nav loveresta-user-journey__nav--prev"
            onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
            type="button"
          >
            <ArrowLeft size={24} strokeWidth={2.1} />
          </button>
        ) : null}

        {canScrollNext ? (
          <button
            aria-label="Следующий шаг"
            className="loveresta-user-journey__nav loveresta-user-journey__nav--next"
            onClick={() => scrollToIndex(Math.min(activeIndex + 1, steps.length - 1))}
            type="button"
          >
            <ArrowRight size={24} strokeWidth={2.1} />
          </button>
        ) : null}
      </div>

      <div className="loveresta-user-journey__dots" aria-label="Навигация по шагам">
        {steps.map((step, index) => (
          <button
            key={step.step}
            aria-label={`Перейти к шагу ${step.step}`}
            className={`loveresta-user-journey__dot ${activeIndex === index ? 'loveresta-user-journey__dot--active' : ''}`}
            onClick={() => scrollToIndex(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
