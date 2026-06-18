'use client';

import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockFreeIcons, ZapFreeIcons, Leaf01FreeIcons, StarFreeIcons } from '@hugeicons/core-free-icons';

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

export default function CTASection() {
  const { ref, inView } = useInView(0.2);

  return (
    <section
      id="join"
      className="relative py-28 overflow-hidden"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #0a4728 0%, #0a4728 100%)',
        }}
      />
      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-float"
        style={{ background: 'radial-gradient(circle, #a5d932, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 animate-float"
        style={{ background: 'radial-gradient(circle, #a5d932, transparent)', filter: 'blur(70px)', animationDelay: '2s' }} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center" ref={ref}>
        <h2
          className="text-white mb-5"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
          }}
        >
          Готовы открыть FoodSave<br />
          <span style={{
            background: 'linear-gradient(135deg, #a5d932, #c8f050)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            в Telegram?
          </span>
        </h2>

        <p
          className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 300,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
          }}
        >
          Присоединяйтесь к тысячам казахстанцев, которые пользуются FoodSave
          как мини-приложением в Telegram каждый день.
        </p>

        {/* Telegram mini app button */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
          }}
        >
          <a
            href="https://t.me/FoodSave_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: '#29abee', boxShadow: '0 8px 32px rgba(41,171,238,0.35)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="flex-shrink-0">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <div className="text-left">
              <div className="text-white/70 text-[10px] leading-none" style={{ fontFamily: 'DM Sans, sans-serif' }}>Открыть в</div>
              <div className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Telegram</div>
            </div>
          </a>
        </div>

        {/* Trust row */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 mt-10"
          style={{
            opacity: inView ? 1 : 0,
            transition: 'opacity 1s ease 0.55s',
          }}
        >
          {[
            { iconComp: LockFreeIcons, text: 'Безопасная оплата' },
            { iconComp: ZapFreeIcons, text: 'Мгновенная бронь' },
            { iconComp: Leaf01FreeIcons, text: 'Реальный эффект' },
            { iconComp: StarFreeIcons, text: 'Рейтинг 4.9/5' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <HugeiconsIcon icon={item.iconComp} size={14} primaryColor="rgba(255,255,255,0.5)" />
              <span className="text-white/50 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
