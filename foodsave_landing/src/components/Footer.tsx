"use client";
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiMail01FreeIcons,
  AiPhone01FreeIcons,
  Facebook01FreeIcons,
  InstagramIcon,
  Linkedin01FreeIcons,
  MapPinIcon,
} from '@hugeicons/core-free-icons';
import { BrandLogo } from '@/components/loveresta/brand-logo';
import { FooterBackgroundGradient } from '@/components/ui/hover-footer';

const footerLinks = [
  {
    title: 'О нас',
    links: [
      { label: 'Наша миссия', href: '#manifesto' },
      { label: 'История проекта', href: '#' },
      { label: 'Команда', href: '#' },
      { label: 'Пресс-кит', href: '#' },
    ],
  },
  {
    title: 'Быстрые ссылки',
    links: [
      { label: 'Открыть мини-приложение', href: 'https://t.me/FoodSave_bot' },
      { label: 'Как это работает', href: '#how-it-works' },
      { label: 'Для бизнеса', href: '#partnership' },
      { label: 'Отчёт по устойчивому развитию', href: '#' },
    ],
  },
];

const contactInfo = [
  { icon: AiMail01FreeIcons, text: 'hello@foodsave.kz', href: 'mailto:hello@foodsave.kz' },
  { icon: AiPhone01FreeIcons, text: '+7 (701) 000-00-00', href: 'tel:+77010000000' },
  { icon: MapPinIcon, text: 'Астана, Казахстан' },
];

const socialLinks = [
  { icon: InstagramIcon, label: 'Instagram', href: '#' },
  { icon: Facebook01FreeIcons, label: 'Facebook', href: '#' },
  { icon: Linkedin01FreeIcons, label: 'LinkedIn', href: '#' },
];

export default function Footer() {
  return (
    <footer
      className="relative rounded-t-[2.5rem] overflow-hidden"
      style={{ background: '#0a4728' }}
    >
      <div className="max-w-7xl mx-auto px-8 lg:px-14 pt-14 pb-0 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 pb-12">
          {/* Brand */}
          <div className="flex flex-col space-y-5">
            <div>
              <BrandLogo className="w-[168px] h-auto" />
            </div>
            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}
            >
              Спасаем вкусную еду по всему Казахстану и превращаем осознанный выбор в новый статус.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  <HugeiconsIcon icon={icon} size={18} primaryColor="currentColor" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-sm mb-6 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-6 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Контакты
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <HugeiconsIcon icon={item.icon} size={16} primaryColor="#a5d932" />
                  {item.href ? (
                    <a href={item.href} className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        <div className="py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}>
            © 2026 FoodSave. Сделано в Казахстане.
          </span>
          <div className="flex gap-5">
            {['Политика конфиденциальности', 'Условия использования', 'Настройки cookie'].map((item) => (
              <a key={item} href="#" className="text-xs hover:text-white/60 transition-colors" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:flex hidden h-[20rem] -mt-24 -mb-14 relative z-10 items-end justify-center">
        <BrandLogo className="w-[340px] h-auto opacity-55" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
