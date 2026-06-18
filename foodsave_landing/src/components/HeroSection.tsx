'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01FreeIcons } from '@hugeicons/core-free-icons';

const heroStats = [
  { value: 'до 80%', label: 'выгода на заказе' },
  { value: '247K+', label: 'кг еды спасено' },
  { value: '15 мин', label: 'чтобы начать' },
];

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#0a4728' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 40%, rgba(165,217,50,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 10% 80%, rgba(58,155,106,0.15) 0%, transparent 55%),
            linear-gradient(160deg, #0a4728 0%, #0a4728 100%)
          `,
        }}
      />

      <div
        className="absolute w-80 h-80 rounded-full opacity-10 animate-float"
        style={{ background: 'radial-gradient(circle, #a5d932, transparent)', top: '15%', right: '8%', animationDelay: '0s', filter: 'blur(40px)' }}
      />
      <div
        className="absolute w-64 h-64 rounded-full opacity-8 animate-float"
        style={{ background: 'radial-gradient(circle, #a5d932, transparent)', bottom: '20%', left: '5%', animationDelay: '2s', filter: 'blur(50px)' }}
      />

      <div
        className="absolute top-0 right-0 w-1/3 h-full opacity-5"
        style={{ background: 'linear-gradient(180deg, #a5d932 0%, transparent 60%)', clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 0% 100%)' }}
      />

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-left">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{
                background: 'rgba(165,217,50,0.15)',
                border: '1px solid rgba(165,217,50,0.3)',
                color: '#d7f78c',
                fontFamily: 'var(--font-body), sans-serif',
                transitionDelay: '0.1s',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: '#a5d932', boxShadow: '0 0 8px #a5d932' }} />
              FoodSave в Telegram
            </div>

            <h1
              className={`text-white leading-[0.98] mb-5 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(2.4rem, 5.8vw, 4.7rem)',
                transitionDelay: '0.2s',
                letterSpacing: '-0.04em',
              }}
            >
              Забирайте еду
              <br />
              <span style={{ color: '#a5d932' }}>с выгодой до 80%</span>
            </h1>

            <p
              className={`text-white/72 text-[17px] leading-relaxed mb-8 max-w-xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ fontFamily: 'var(--font-body), sans-serif', fontWeight: 400, transitionDelay: '0.35s' }}
            >
              Находите свежие предложения от кафе и пекарен Астаны прямо в <strong>@FoodSave_bot</strong>.
              Без отдельного приложения: открыли, выбрали, забрали.
            </p>

            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '0.5s' }}
            >
              <a
                href="https://t.me/FoodSave_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                style={{
                  background: '#29abee',
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading), sans-serif',
                  boxShadow: '0 10px 32px rgba(41,171,238,0.35)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="relative z-10 flex-shrink-0">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="relative z-10">Открыть @FoodSave_bot</span>
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: '#1e9bd8' }}
                />
              </a>
              <a
                href="#partnership"
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold text-base text-white transition-all duration-300 hover:bg-white/10"
                style={{ border: '1.5px solid rgba(255,255,255,0.4)', fontFamily: 'var(--font-heading), sans-serif' }}
              >
                Для бизнеса
              </a>
            </div>

            

            <div
              className={`grid grid-cols-3 gap-3 sm:gap-4 mt-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '0.65s' }}
            >
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl px-4 py-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="text-[1.4rem] sm:text-[1.65rem] font-bold leading-none"
                    style={{ fontFamily: 'var(--font-heading), sans-serif', color: '#a5d932' }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-[11px] sm:text-xs text-white/55 mt-2"
                    style={{ fontFamily: 'var(--font-body), sans-serif' }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`flex items-center justify-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            style={{ transitionDelay: '0.4s' }}
          >
            <div className="relative animate-float" style={{ animationDelay: '0.5s' }}>
              <div
                className="w-full max-w-[260px] sm:max-w-[290px] lg:max-w-[310px] rounded-[30px] overflow-hidden"
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 30px 64px rgba(0,0,0,0.38)',
                }}
              >
                <Image
                  src="/hero-foodsave-telegram.png"
                  alt="Скриншот FoodSave в Telegram Mini App"
                  width={1179}
                  height={2556}
                  priority
                  className="block w-full h-auto"
                />
              </div>

              <div
                className="absolute -left-8 top-[22%] bg-white rounded-2xl px-3.5 py-2.5 shadow-2xl"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
              >
                <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-body), sans-serif' }}>Без скачивания</div>
                <div className="font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-heading), sans-serif', color: '#0a4728' }}>прямо в Telegram</div>
              </div>

              <div
                className="absolute -right-7 top-[14%] bg-white rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-2"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#2AABEE' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-heading), sans-serif', color: '#1c1c1e' }}>Mini App</span>
              </div>

              <div
                className="absolute -right-8 bottom-[18%] bg-white rounded-2xl px-3.5 py-2.5 shadow-2xl"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
              >
                <div className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-body), sans-serif' }}>Покупатели получают</div>
                <div className="font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-heading), sans-serif', color: '#a5d932' }}>до 80% выгоды</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 animate-chevron-bounce">
        <a href="#impact" className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
          <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-body), sans-serif' }}>листать</span>
          <HugeiconsIcon icon={ArrowDown01FreeIcons} size={16} primaryColor="currentColor" />
        </a>
      </div>

    </section>
  );
}
