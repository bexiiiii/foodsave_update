'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ActionLink } from '@/components/loveresta/action-link';

type MobileNavMenuProps = {
  ctaHref: string;
  ctaLabel: string;
  links: Array<{
    href: string;
    label: string;
  }>;
};

export function MobileNavMenu({
  ctaHref,
  ctaLabel,
  links,
}: MobileNavMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className={`loveresta-mobile-nav${isOpen ? ' is-open' : ''}`}>
      <button
        aria-controls="loveresta-mobile-nav-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
        className="loveresta-mobile-nav__toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <button
        aria-hidden={!isOpen}
        className="loveresta-mobile-nav__backdrop"
        onClick={() => setIsOpen(false)}
        tabIndex={isOpen ? 0 : -1}
        type="button"
      />

      <div
        className="loveresta-mobile-nav__sheet"
        id="loveresta-mobile-nav-panel"
      >
        <nav className="loveresta-mobile-nav__links">
          {links.map((item) => (
            <ActionLink
              key={item.href + item.label}
              className="loveresta-mobile-nav__link"
              href={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </ActionLink>
          ))}
        </nav>

        {ctaHref && ctaLabel ? (
          <ActionLink
            className="loveresta-button loveresta-button--primary"
            href={ctaHref}
            onClick={() => setIsOpen(false)}
          >
            {ctaLabel}
          </ActionLink>
        ) : null}
      </div>
    </div>
  );
}
