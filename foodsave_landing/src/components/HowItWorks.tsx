'use client';

import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01FreeIcons, ShoppingBag01FreeIcons, MapPinFreeIcons, ChartIncreaseFreeIcons, TruckFreeIcons, Award01FreeIcons, Store01FreeIcons } from '@hugeicons/core-free-icons';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const consumerSteps = [
  {
    icon: Search01FreeIcons,
    title: 'Просмотр',
    description: 'Откройте мини-приложение FoodSave в Telegram и смотрите доступные предложения из любимых ресторанов, пекарен и магазинов. Лента обновляется в реальном времени.',
    detail: 'Обновление каждый час',
  },
  {
    icon: ShoppingBag01FreeIcons,
    title: 'Забронировать',
    description: 'Забронируйте понравившийся набор по части розничной цены. Обычно это 30–50% скидки и мгновенная оплата без лишних шагов.',
    detail: 'Скидка 30–50%',
  },
  {
    icon: MapPinFreeIcons,
    title: 'Получение',
    description: 'Приходите в назначенное время, забирайте свежую еду и сокращайте отходы без лишней суеты.',
    detail: 'Забор за 30 минут',
  },
];

const businessCards = [
  {
    icon: ChartIncreaseFreeIcons,
    title: 'Дополнительный доход',
    description: 'Привлекайте новых гостей в непиковые часы. Каждое предложение превращается в продажу и повторный визит.',
    highlight: '+12–18% к выручке',
  },
  {
    icon: TruckFreeIcons,
    title: 'Логистика без отходов',
    description: 'Мы берём на себя распределение, а вы управляете остатками. Интеграция с текущей POS-системой остаётся простой.',
    highlight: 'Без лишней логистики',
  },
  {
    icon: Award01FreeIcons,
    title: 'Экологичный бренд',
    description: 'Показывайте себя как экологичный бренд и привлекайте клиентов, которым важны те же ценности.',
    highlight: 'Сильнее ESG-образ',
  },
];

export default function HowItWorks() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="how-it-works" className="relative py-28 overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(10,71,40,0.04) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(165,217,50,0.04) 0%, transparent 50%)',
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8" ref={ref}>
        {/* Section header */}
        <div
          className="text-center mb-20"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <h2
            className="leading-tight"
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
            }}
          >
            Как это работает
          </h2>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-16 items-stretch">
          {/* ---- Consumer Path ---- */}
          <div
            className="flex h-full flex-col"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(165,217,50,0.12)' }}
              >
                <HugeiconsIcon icon={ShoppingBag01FreeIcons} size={20} primaryColor="#a5d932" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: '#a5d932', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Для пользователей
                </div>
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                >
                  Спасайте вкусную еду за 3 шага
                </h3>
              </div>
            </div>

            <div className="flex-1">
              {/* Steps */}
              <div className="space-y-0">
                {consumerSteps.map((step, i) => {
                  return (
                    <div
                      key={step.title}
                      className="flex gap-5 relative group"
                      style={{
                        opacity: inView ? 1 : 0,
                        transform: inView ? 'translateY(0)' : 'translateY(20px)',
                        transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.2 + i * 0.12}s`,
                      }}
                    >
                      {/* Connector line */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:scale-110"
                          style={{ background: '#0a4728' }}
                        >
                          <HugeiconsIcon icon={step.icon} size={20} primaryColor="white" strokeWidth={2} />
                        </div>
                        {i < consumerSteps.length - 1 && (
                          <div
                            className="w-px flex-1 my-2"
                            style={{ background: 'linear-gradient(to bottom, #0a4728, rgba(10,71,40,0.1))', minHeight: '32px' }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-8 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold"
                            style={{ color: '#a5d932', fontFamily: 'DM Sans, sans-serif' }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <h4
                            className="font-bold text-lg"
                            style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                          >
                            {step.title}
                          </h4>
                        </div>
                        <p
                          className="text-sm leading-relaxed mb-2"
                          style={{ color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {step.description}
                        </p>
                        <span
                          className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(165,217,50,0.1)', color: '#a5d932', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {step.detail}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 lg:mt-auto">
              <a
                href="https://t.me/FoodSave_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: '#29abee',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 8px 24px rgba(41,171,238,0.3)',
                }}
              >
                Открыть FoodSave в Telegram
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          {/* ---- Business Path ---- */}
          <div
            className="flex h-full flex-col"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(24px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(10,71,40,0.1)' }}
              >
                <HugeiconsIcon icon={Store01FreeIcons} size={20} primaryColor="#0a4728" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: '#0a4728', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Для партнёров
                </div>
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                >
                  Превращайте излишки в продажи
                </h3>
              </div>
            </div>

            <div className="flex-1">
              {/* Cards */}
              <div className="space-y-4">
                {businessCards.map((card, i) => {
                  return (
                    <div
                      key={card.title}
                      className="p-5 rounded-2xl flex gap-4 items-start group transition-all duration-300 hover:shadow-lg cursor-pointer"
                      style={{
                        background: '#f9fff5',
                        border: '1px solid rgba(10,71,40,0.08)',
                        opacity: inView ? 1 : 0,
                        transform: inView ? 'translateY(0)' : 'translateY(20px)',
                        transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${0.3 + i * 0.12}s`,
                      }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: '#0a4728' }}
                      >
                        <HugeiconsIcon icon={card.icon} size={20} primaryColor="white" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <h4
                          className="font-bold text-base mb-1.5"
                          style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                        >
                          {card.title}
                        </h4>
                        <p
                          className="text-sm leading-relaxed mb-2"
                          style={{ color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {card.description}
                        </p>
                        <span
                          className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(10,71,40,0.1)', color: '#0a4728', fontFamily: 'DM Sans, sans-serif' }}
                        >
                          ✓ {card.highlight}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Partner CTA */}
            <div className="mt-6 lg:mt-auto">
              <a
                href="#partnership"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #0a4728, #0a4728)',
                  fontFamily: 'Poppins, sans-serif',
                  boxShadow: '0 8px 24px rgba(10,71,40,0.25)',
                }}
              >
                Стать партнёром в Telegram
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
