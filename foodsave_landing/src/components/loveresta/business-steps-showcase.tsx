'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { BusinessStep } from '@/lib/loveresta-data';

function StepMockup({ visual }: { visual: BusinessStep['visual'] }) {
  switch (visual) {
    case 'register':
      return (
        <div className="loveresta-business-card__scene loveresta-business-card__scene--register">
          <div className="loveresta-business-phone">
            <div className="loveresta-business-phone__screen">
              <div className="loveresta-business-phone__bar" />
              <div className="loveresta-business-phone__field" />
              <div className="loveresta-business-phone__field" />
              <div className="loveresta-business-phone__field" />
              <div className="loveresta-business-phone__button" />
            </div>
          </div>
        </div>
      );
    case 'venue':
      return (
        <div className="loveresta-business-card__scene loveresta-business-card__scene--venue">
          <div className="loveresta-business-laptop">
            <div className="loveresta-business-laptop__screen">
              <div className="loveresta-business-laptop__sidebar" />
              <div className="loveresta-business-laptop__content">
                <div className="loveresta-business-laptop__row" />
                <div className="loveresta-business-laptop__row loveresta-business-laptop__row--short" />
                <div className="loveresta-business-laptop__tile" />
              </div>
            </div>
          </div>
          <div className="loveresta-business-float-card loveresta-business-float-card--venue" />
        </div>
      );
    case 'network':
      return (
        <div className="loveresta-business-card__scene loveresta-business-card__scene--network">
          <div className="loveresta-business-network">
            <span className="loveresta-business-network__node loveresta-business-network__node--center" />
            <span className="loveresta-business-network__node loveresta-business-network__node--top" />
            <span className="loveresta-business-network__node loveresta-business-network__node--left" />
            <span className="loveresta-business-network__node loveresta-business-network__node--right" />
            <span className="loveresta-business-network__node loveresta-business-network__node--bottom" />
          </div>
        </div>
      );
    case 'products':
      return (
        <div className="loveresta-business-card__scene loveresta-business-card__scene--products">
          <div className="loveresta-business-laptop">
            <div className="loveresta-business-laptop__screen">
              <div className="loveresta-business-laptop__sidebar" />
              <div className="loveresta-business-laptop__content">
                <div className="loveresta-business-laptop__row" />
                <div className="loveresta-business-laptop__tile" />
                <div className="loveresta-business-laptop__row loveresta-business-laptop__row--short" />
              </div>
            </div>
          </div>
          <div className="loveresta-business-modal">
            <div className="loveresta-business-modal__title" />
            <div className="loveresta-business-modal__field" />
            <div className="loveresta-business-modal__field" />
            <div className="loveresta-business-modal__field loveresta-business-modal__field--short" />
          </div>
        </div>
      );
    case 'orders':
      return (
        <div className="loveresta-business-card__scene loveresta-business-card__scene--orders">
          <div className="loveresta-business-laptop">
            <div className="loveresta-business-laptop__screen">
              <div className="loveresta-business-laptop__sidebar" />
              <div className="loveresta-business-laptop__content">
                <div className="loveresta-business-laptop__row" />
                <div className="loveresta-business-laptop__tile" />
              </div>
            </div>
          </div>
          <div className="loveresta-business-order-stack">
            <div className="loveresta-business-order-card" />
            <div className="loveresta-business-order-card" />
            <div className="loveresta-business-order-card" />
          </div>
        </div>
      );
  }
}

export function BusinessStepsShowcase({ steps }: { steps: BusinessStep[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const initialIndex = steps.length >= 4 ? 3 : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [canScrollPrev, setCanScrollPrev] = useState(initialIndex > 0);
  const [canScrollNext, setCanScrollNext] = useState(initialIndex < steps.length - 1);

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
      const target = slideRefs.current[initialIndex];

      if (target) {
        viewport.scrollTo({ left: target.offsetLeft, behavior: 'auto' });
      }

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
  }, [initialIndex]);

  return (
    <section className="loveresta-container loveresta-business-showcase">
      <div className="loveresta-business-showcase__layout">
        <div className="loveresta-business-showcase__copy">
          <span className="loveresta-business-showcase__eyebrow">БИЗНЕСУ</span>
          <h2 className="loveresta-business-showcase__title">
            Подключитесь за 5 минут и начните продавать сегодня
          </h2>
          <p className="loveresta-business-showcase__text">
            То, что вы списываете — не потери. Это нереализованный доход. Сервис уже
            подготовлен под сеть точек и единый кабинет.
          </p>
          <Link className="loveresta-business-showcase__cta" href="/register">
            Разместить за одну минуту
          </Link>
        </div>

        <div className="loveresta-business-showcase__rail">
          <div ref={viewportRef} className="loveresta-business-carousel__viewport">
            <div className="loveresta-business-carousel__track">
              {steps.map((step, index) => (
                <article
                  key={step.step}
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                  className="loveresta-business-slide"
                >
                  <div className="loveresta-business-card">
                    <span className="loveresta-business-card__pill">Шаг {step.step}</span>
                    <h3 className="loveresta-business-card__title">{step.title}</h3>

                    <div className="loveresta-business-card__progress" aria-hidden="true">
                      {steps.map((item, progressIndex) => (
                        <div key={item.step} className="loveresta-business-card__progress-item">
                          <span
                            className={`loveresta-business-card__dot ${
                              progressIndex < step.step
                                ? 'loveresta-business-card__dot--filled'
                                : ''
                            }`}
                          >
                            {progressIndex < step.step - 1 ? <Check size={12} strokeWidth={3} /> : null}
                          </span>
                          {progressIndex < steps.length - 1 ? (
                            <span
                              className={`loveresta-business-card__line ${
                                progressIndex < step.step - 1
                                  ? 'loveresta-business-card__line--filled'
                                  : ''
                              }`}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <StepMockup visual={step.visual} />
                  </div>

                  <div className="loveresta-business-slide__caption">
                    <strong>Шаг {step.step}</strong>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {canScrollPrev ? (
            <button
              aria-label="Предыдущий шаг"
              className="loveresta-business-carousel__nav loveresta-business-carousel__nav--prev"
              onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
              type="button"
            >
              <ArrowLeft size={28} strokeWidth={2.1} />
            </button>
          ) : null}

          {canScrollNext ? (
            <button
              aria-label="Следующий шаг"
              className="loveresta-business-carousel__nav loveresta-business-carousel__nav--next"
              onClick={() => scrollToIndex(Math.min(activeIndex + 1, steps.length - 1))}
              type="button"
            >
              <ArrowRight size={28} strokeWidth={2.1} />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
