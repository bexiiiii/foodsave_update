'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01FreeIcons, Cancel01FreeIcons, Leaf01FreeIcons } from '@hugeicons/core-free-icons';

const links = [
  { label: 'Для бизнеса', href: '#partnership' },
  { label: 'Как это работает', href: '#how-it-works' },
  { label: 'Присоединиться', href: '#join' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? 'rgba(10,71,40, 0.97)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #a5d932, #8ab82a)' }}
            >
              <HugeiconsIcon icon={Leaf01FreeIcons} size={16} primaryColor="white" strokeWidth={2} />
            </div>
            <span
              className="text-white font-display font-700 text-xl tracking-tight"
              style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700 }}
            >
              Food<span style={{ color: '#a5d932' }}>Save</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="link-hover text-white/80 hover:text-white text-sm font-medium transition-colors duration-200"
                style={{ fontFamily: 'var(--font-body), sans-serif' }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3 ">
            <a
              href="https://t.me/FoodSave_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: '#29abee',
                color: '#ffffff',
                fontFamily: 'var(--font-heading), sans-serif',
                boxShadow: '0 10px 28px rgba(41,171,238,0.28)',
              }}
            >
              Открыть в Telegram
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Меню"
          >
            {open
              ? <HugeiconsIcon icon={Cancel01FreeIcons} size={20} primaryColor="white" />
              : <HugeiconsIcon icon={Menu01FreeIcons} size={20} primaryColor="white" />
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className="md:hidden transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: open ? '320px' : '0',
          background: 'rgba(10,71,40, 0.98)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="px-6 pb-6 pt-2 flex flex-col gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-base font-medium py-2 border-b border-white/10 transition-colors"
              style={{ fontFamily: 'var(--font-body), sans-serif' }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://t.me/FoodSave_bot"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-2 px-5 py-3 rounded-full text-sm font-semibold text-center transition-all duration-200"
            style={{
              background: '#29abee',
              color: '#ffffff',
              fontFamily: 'var(--font-heading), sans-serif',
              boxShadow: '0 10px 28px rgba(41,171,238,0.28)',
            }}
          >
            Открыть в Telegram
          </a>
        </div>
      </div>
    </header>
  );
}
