'use client';

import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Agreement01FreeIcons,
  CheckmarkCircle01FreeIcons,
} from '@hugeicons/core-free-icons';

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

export default function PartnershipForm() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="partnership"
      className="relative py-28 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(10,71,40,0.04) 0%, transparent 50%)',
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8" ref={ref}>
        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <h2
            className="leading-tight"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#1A1A1A', letterSpacing: '-0.02em' }}
          >
            Станьте партнёром
          </h2>
          <p
            className="text-gray-500 text-base mt-3 max-w-md mx-auto"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Готовы сократить списания и привлечь новых клиентов? Мы свяжемся с вами в течение 24 часов.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto items-start">
          {/* Left — Value props */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            <div
              className="rounded-3xl p-8 mb-8"
              style={{ background: '#0a4728', boxShadow: '0 24px 64px rgba(10,71,40,0.2)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(165,217,50,0.14)' }}>
                <HugeiconsIcon icon={Agreement01FreeIcons} size={24} primaryColor="#a5d932" />
              </div>
              <h3
                className="text-white font-bold text-xl mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Меняем рынок вместе
              </h3>
              <p
                className="text-white/70 text-sm leading-relaxed mb-6"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Более 1000 ресторанов и заведений в Астане уже доверяют FoodSave, чтобы превращать
                ежедневные излишки в дополнительную выручку.
              </p>

              {[
                { metric: '12–18%', label: 'средний рост выручки в месяц' },
                { metric: '200 кг', label: 'среднее сокращение отходов за неделю' },
                { metric: '48 ч', label: 'среднее время подключения' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="font-bold text-lg"
                    style={{ color: '#a5d932', fontFamily: 'Poppins, sans-serif', minWidth: '64px' }}
                  >
                    {item.metric}
                  </span>
                  <span className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Testimonial snippet */}
            <div
              className="rounded-2xl p-5"
              style={{ background: '#f9fff5', border: '1px solid rgba(10,71,40,0.08)' }}
            >
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <HugeiconsIcon key={i} icon={CheckmarkCircle01FreeIcons} size={14} primaryColor="#a5d932" />
                ))}
              </div>
              <p
                className="text-sm leading-relaxed mb-3"
                style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B6B6B', fontStyle: 'italic' }}
              >
                «Подключение заняло 15 минут. Теперь у нас ноль хлебных списаний каждый день.»
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#8ab82a', fontFamily: 'Poppins, sans-serif' }}
                >
                  AB
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}>
                    Аязат Б.
                  </div>
                  <div className="text-xs" style={{ color: '#A0A0A0', fontFamily: 'DM Sans, sans-serif' }}>
                    Bread & Co Bakery
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Contacts */}
          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(24px)',
              transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            }}
          >
            <div
              className="rounded-3xl p-8"
              style={{ background: '#f9fff5', border: '1px solid rgba(10,71,40,0.08)' }}
            >
              <h3
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
              >
                Напишите нам напрямую
              </h3>
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ fontFamily: 'DM Sans, sans-serif', color: '#6B6B6B' }}
              >
                Выберите удобный канал связи. Ответим по партнёрству, подключению и условиям размещения.
              </p>

              <div className="space-y-4">
                <a
                  href="https://t.me/FoodSave_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: '#29abee',
                    boxShadow: '0 10px 28px rgba(41,171,238,0.22)',
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white/72 text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Telegram
                    </div>
                    <div className="text-white font-semibold text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Открыть @FoodSave_bot
                    </div>
                  </div>
                </a>

                <a
                  href="https://wa.me/77010000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: '#25D366',
                    boxShadow: '0 10px 28px rgba(37,211,102,0.22)',
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                      <path d="M20.52 3.48A11.88 11.88 0 0 0 12.06 0C5.52 0 .2 5.32.2 11.86c0 2.1.55 4.16 1.6 5.97L0 24l6.35-1.66a11.8 11.8 0 0 0 5.7 1.45h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.4-8.45Zm-8.46 18.3h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.77.99 1.01-3.67-.23-.38A9.82 9.82 0 0 1 2.2 11.86C2.2 6.42 6.62 2 12.06 2c2.63 0 5.1 1.02 6.96 2.88a9.78 9.78 0 0 1 2.9 6.97c0 5.44-4.42 9.86-9.86 9.86Zm5.41-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.26-.46-2.4-1.47-.88-.78-1.48-1.74-1.66-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.66-1.59-.91-2.18-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.71.23 1.36.2 1.88.12.57-.08 1.76-.72 2.01-1.42.25-.69.25-1.28.17-1.42-.08-.13-.28-.2-.57-.35Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-white/72 text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      WhatsApp
                    </div>
                    <div className="text-white font-semibold text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Написать в WhatsApp
                    </div>
                  </div>
                </a>
              </div>

              <p
                className="mt-5 text-xs text-gray-400"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Если нужен другой способ связи, используйте номер из футера.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
