'use client';

import { useEffect, useRef, useState } from 'react';

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function MovementManifesto() {
  const { ref, inView } = useInView(0.15);

  return (
    <section
      id="manifesto"
      className="relative py-32 overflow-hidden"
      style={{ background: '#f9fff5' }}
    >
      {/* Background decorative text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden
      >
        <span
          className="font-bold text-[20vw] opacity-[0.03] whitespace-nowrap"
          style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#0a4728',
            letterSpacing: '-0.05em',
          }}
        >
          ОСОЗНАННО
        </span>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
        <div ref={ref} className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Visual accent column */}
          <div
            className="relative"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-32px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Large quote mark */}
            <div
              className="absolute -top-6 -left-4 text-9xl leading-none select-none pointer-events-none"
              style={{
                fontFamily: 'Poppins, sans-serif',
                color: '#a5d932',
                opacity: 0.2,
                lineHeight: 1,
              }}
              aria-hidden
            >
              &ldquo;
            </div>

            {/* Card stack */}
            <div className="relative">
              {/* Background card */}
              <div
                className="absolute inset-0 rounded-3xl rotate-3 scale-95"
                style={{ background: 'rgba(165,217,50,0.08)', border: '1px solid rgba(165,217,50,0.15)' }}
              />
              {/* Main card */}
              <div
                className="relative rounded-3xl p-8 lg:p-10"
                style={{
                  background: '#0a4728',
                  boxShadow: '0 24px 64px rgba(10,71,40,0.25)',
                }}
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                  style={{
                    background: 'rgba(165,217,50,0.2)',
                    color: '#a5d932',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                Движение осознанности
                </div>

                <blockquote
                  className="text-white text-xl leading-relaxed mb-8"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', fontWeight: 300 }}
                >
                  &laquo;Поколение, выросшее в эпоху стремительного роста Астаны, сейчас переписывает определение успеха.&raquo;
                </blockquote>

                {/* Decorative divider */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
                  <span style={{ color: '#a5d932', fontSize: '18px' }}>✦</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Trait chips */}
                <div className="flex flex-wrap gap-2">
                  {['Осознанный', 'Современный', 'Удобный', 'Ответственный'].map((trait) => (
                    <span
                      key={trait}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.7)',
                        fontFamily: 'DM Sans, sans-serif',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stat badge */}
            <div
              className="absolute -bottom-5 -right-5 rounded-2xl px-6 py-4 shadow-2xl"
              style={{
                background: '#a5d932',
                boxShadow: '0 12px 40px rgba(165,217,50,0.4)',
              }}
            >
              <div
                className="text-3xl font-bold text-white leading-none"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                51%
              </div>
              <div
                className="text-white/80 text-xs mt-1"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Казахстана моложе 29 лет
              </div>
            </div>
          </div>

          {/* Right — Text */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(32px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
            }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{
                background: 'rgba(10,71,40,0.1)',
                color: '#0a4728',
                fontFamily: 'DM Sans, sans-serif',
                border: '1px solid rgba(10,71,40,0.15)',
              }}
            >
              Манифест FoodSave
            </div>

            <h2
              className="leading-[1.1] mb-6"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                color: '#1A1A1A',
                letterSpacing: '-0.02em',
              }}
            >
              За пределами <span style={{ color: '#a5d932' }}>&laquo;Понтов&raquo;</span>
              <br />— Настоящий статус это
              <br />Ответственность
            </h2>

            <div
              className="space-y-4 text-base leading-relaxed"
              style={{ color: '#6B6B6B', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}
            >
              <p>
                Для многих поколений статус определялся внешними символами. Чем больше машина — тем громче заявление.
                Но новое поколение переписывает эти правила.
              </p>
              <p>
                В сегодняшнем Казахстане выбранные вами бренды определяют ваши ценности — и ваш интеллект.
                FoodSave — это мини-приложение в Telegram для тех, кто понял: устойчивость — это не жертва.{' '}
                <strong style={{ color: '#0a4728', fontWeight: 600 }}>Это стиль.</strong>
              </p>
              <p>
                Спасение еды экономит деньги. Бережёт ресурсы. Но главное — оно говорит о том, кто вы есть:
                вдумчивый, современный, прогрессивный. Тот, кто понимает, что настоящий статус приходит от понимания того, что важно.
              </p>
            </div>

            {/* Closing statement */}
            <div
              className="mt-8 p-6 rounded-2xl relative overflow-hidden"
              style={{
                background: 'rgba(10,71,40,0.06)',
                border: '1px solid rgba(10,71,40,0.12)',
              }}
            >
              <p
                className="text-lg font-semibold leading-snug"
                style={{ fontFamily: 'Poppins, sans-serif', color: '#0a4728' }}
              >
                Это не просто мини-приложение. Это движение.
                И оно только для тех, кто достаточно смел, чтобы изменить правила игры.
              </p>
              <div
                className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-5"
                style={{ background: '#a5d932', transform: 'translate(30%, 30%)' }}
              />
            </div>

            <a
              href="#join"
              className="inline-flex items-center gap-3 mt-8 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0a4728, #0a4728)',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 8px 24px rgba(10,71,40,0.3)',
              }}
            >
              Открыть в Telegram
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
