import type { Metadata } from 'next';

import { PageShell } from '@/components/loveresta/ui';

function WhatsAppIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M20.52 11.78c0 4.65-3.77 8.42-8.42 8.42-1.48 0-2.92-.39-4.19-1.12L3.5 20.5l1.47-4.27a8.38 8.38 0 0 1-1.3-4.45 8.42 8.42 0 0 1 16.85 0Z"
        fill="currentColor"
      />
      <path
        d="M15.88 13.55c-.2-.1-1.19-.58-1.37-.64-.18-.07-.31-.1-.44.1-.13.19-.5.63-.61.76-.12.13-.23.14-.43.05-.2-.1-.84-.3-1.6-.96a6 6 0 0 1-1.11-1.38c-.12-.2-.02-.3.08-.4.09-.09.2-.23.3-.35.1-.12.13-.2.2-.34.07-.13.03-.25-.02-.35-.05-.1-.44-1.06-.6-1.46-.16-.37-.32-.32-.44-.33h-.38c-.13 0-.34.05-.51.25-.18.2-.67.65-.67 1.58 0 .93.68 1.83.77 1.96.1.13 1.35 2.06 3.27 2.89.46.2.82.32 1.1.41.47.15.89.13 1.22.08.37-.05 1.19-.49 1.36-.95.17-.47.17-.87.12-.95-.05-.08-.18-.13-.38-.23Z"
        fill="#fff"
      />
    </svg>
  );
}

function TelegramIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path
        d="m16.6 7.77-1.58 8.06c-.12.57-.45.71-.91.45l-2.5-1.84-1.2 1.15c-.13.13-.25.25-.51.25l.18-2.56 4.67-4.21c.2-.18-.05-.28-.31-.1L8.67 12.6l-2.46-.77c-.53-.17-.54-.53.1-.78l9.61-3.7c.44-.17.83.1.68.8Z"
        fill="#fff"
      />
    </svg>
  );
}

export const metadata: Metadata = {
  title: 'Помощь | FoodSave',
  description: 'Свяжитесь с поддержкой FoodSave через WhatsApp или Telegram.',
};

const whatsappHref =
  'https://wa.me/77010000000?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21%20%D0%9D%D1%83%D0%B6%D0%BD%D0%B0%20%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%20%D0%BF%D0%BE%20FoodSave.';
const telegramHref = 'https://t.me/foodsave_kazakhstan';

export default function HelpPage() {
  return (
    <PageShell>
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-help">
          <article className="loveresta-surface loveresta-help__surface">
            <span className="loveresta-eyebrow">Помощь</span>
            <h1 className="loveresta-hero-title loveresta-help__title">
              Выберите удобный канал связи
            </h1>
            <p className="loveresta-hero-copy loveresta-help__copy">
              Если нужен ответ по заказу, возврату, партнёрству или работе сервиса,
              напишите нам напрямую в мессенджер.
            </p>

            <div className="loveresta-help__grid">
              <a
                className="loveresta-help__channel loveresta-help__channel--whatsapp"
                href={whatsappHref}
                rel="noreferrer"
                target="_blank"
              >
                <span className="loveresta-help__iconWrap">
                  <WhatsAppIcon className="loveresta-help__icon" />
                </span>
                <span className="loveresta-help__text">
                  <strong>Написать в WhatsApp</strong>
                  <small>Быстрый чат с поддержкой FoodSave</small>
                </span>
              </a>

              <a
                className="loveresta-help__channel loveresta-help__channel--telegram"
                href={telegramHref}
                rel="noreferrer"
                target="_blank"
              >
                <span className="loveresta-help__iconWrap">
                  <TelegramIcon className="loveresta-help__icon" />
                </span>
                <span className="loveresta-help__text">
                  <strong>Открыть Telegram</strong>
                  <small>Перейти в официальный Telegram FoodSave</small>
                </span>
              </a>
            </div>
          </article>
        </section>
      </main>
    </PageShell>
  );
}
