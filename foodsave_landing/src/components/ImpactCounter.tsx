'use client';

import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Dish01FreeIcons, Plant01FreeIcons, SpoonAndForkFreeIcons } from '@hugeicons/core-free-icons';

interface CounterItemProps {
  target: number;
  suffix?: string;
  prefix?: string;
  label: string;
  sublabel: string;
  icon: object;
  delay?: number;
}

function useCountUp(target: number, duration: number = 2000, active: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    let raf: number;

    const animate = () => {
      start += step;
      if (start < target) {
        setCount(Math.floor(start));
        raf = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return count;
}

function CounterItem({ target, suffix = '', prefix = '', label, sublabel, icon, delay = 0 }: CounterItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(target, 2200, active);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => { setVisible(true); setActive(true); }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1);
    if (n >= 1_000) return n.toLocaleString('ru-RU');
    return n.toString();
  };

  const getUnit = (n: number) => {
    if (n >= 1_000_000) return 'M';
    return '';
  };

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center px-8 py-10 relative group"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
        style={{ background: 'rgba(165,217,50,0.15)', border: '1px solid rgba(165,217,50,0.25)' }}
      >
        <HugeiconsIcon icon={icon as never} size={28} primaryColor="#a5d932" strokeWidth={1.5} />
      </div>

      <div className="flex items-end gap-0.5 leading-none mb-3">
        <span className="text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(2.8rem, 5vw, 4rem)', letterSpacing: '-0.03em', lineHeight: 1, color: '#a5d932' }}>
          {prefix}{formatNumber(count)}{getUnit(target)}
        </span>
        <span className="text-2xl font-bold mb-1" style={{ color: '#a5d932', fontFamily: 'Poppins, sans-serif' }}>
          {suffix}
        </span>
      </div>

      <div className="text-white font-semibold text-lg mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {label}
      </div>
      <div className="text-white/40 text-sm leading-relaxed max-w-[200px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {sublabel}
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 hidden lg:block"
        style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

export default function ImpactCounter() {
  const stats = [
    {
      target: 247000,
      suffix: ' кг',
      label: 'Еды спасено',
      sublabel: 'Свежая еда спасена от полигонов Астаны',
      icon: Dish01FreeIcons,
      delay: 0,
    },
    {
      target: 1200000,
      label: 'кг CO₂ предотвращено',
      sublabel: 'Выбросы углерода, предотвращённые благодаря FoodSave',
      icon: Plant01FreeIcons,
      delay: 150,
    },
    {
      target: 43000,
      suffix: '+',
      label: 'Блюд спасено',
      sublabel: 'Настоящая еда, которая дошла до людей',
      icon: SpoonAndForkFreeIcons,
      delay: 300,
    },
  ];

  return (
    <section id="impact" className="relative py-8" style={{ background: '#0a4728' }}>
      <div className="relative z-10 py-16" style={{ background: 'linear-gradient(160deg, #0a4728 0%, #0a4728 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center mb-4">
          <h2 className="text-white leading-tight"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}>
            FoodSave,{' '}
            <span style={{ color: '#a5d932' }}>в цифрах</span>
          </h2>
          <p className="text-white/50 text-base mt-3 max-w-lg mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Каждое спасение обновляет эти цифры в режиме реального времени. Наблюдайте за ростом.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 mt-8 rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {stats.map((stat) => (
              <CounterItem key={stat.label} {...stat} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-8">
          <span className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#a5d932', boxShadow: '0 0 8px #a5d932' }} />
          <span className="text-white/40 text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Онлайн — обновляется по мере спасений по всей Астане
          </span>
        </div>
      </div>
    </section>
  );
}
