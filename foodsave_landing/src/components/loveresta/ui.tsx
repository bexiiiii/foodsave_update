import Image from 'next/image';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import {
  ChevronDown,
  Clock3,
  Heart,
  Info,
  MapPin,
  Navigation,
  Share2,
  Star,
} from 'lucide-react';

import { BusinessStepsShowcase } from '@/components/loveresta/business-steps-showcase';
import { ActionLink } from '@/components/loveresta/action-link';
import { BrandLogo } from '@/components/loveresta/brand-logo';
import { MobileNavMenu } from '@/components/loveresta/mobile-nav-menu';
import { RecommendedOffersGallery } from '@/components/loveresta/recommended-offers-gallery';
import { UsersBenefitsCarousel } from '@/components/loveresta/users-benefits-carousel';
import { UsersJourneyShowcase } from '@/components/loveresta/users-journey-showcase';
import { UsersReviewsCarousel } from '@/components/loveresta/users-reviews-carousel';
import {
  businessBenefits,
  businessCalculatorMetrics,
  businessCalculatorResult,
  businessFaqs,
  businessSteps,
  privacyLastUpdated,
  userBenefits,
  userBoxCallouts,
  userFaqs,
  userJourneySteps,
  userReviews,
  type BusinessBenefit,
  type DemoOrder,
  type Offer,
  privacySections,
  privacyVersion,
  type Venue,
  worldExamples,
} from '@/lib/loveresta-data';
import { formatKztPrice } from '@/lib/utils';

const navLinks = [
  { href: '/forUsers', label: 'Пользователям' },
  { href: '/', label: 'Каталог' },
  { href: '/forbussines', label: 'Бизнесу' },
  { href: '/privacy', label: 'FAQ / Политика' },
];

function HeaderNavLinks({
  className,
  linkClassName = 'loveresta-nav__link',
}: {
  className: string;
  linkClassName?: string;
}) {
  return (
    <nav className={className}>
      {navLinks.map((item) => (
        <Link key={item.href + item.label} className={linkClassName} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function TelegramIcon(props: ComponentProps<'svg'>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M21 4.8 17.9 19c-.24 1.02-.86 1.27-1.75.8l-4.6-3.4-2.22 2.14c-.24.24-.45.45-.92.45l.33-4.72 8.6-7.77c.38-.33-.08-.52-.58-.19L6.12 13.02l-4.53-1.42c-.98-.31-1-.98.2-1.45l17.7-6.82c.82-.3 1.54.19 1.27 1.47Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon(props: ComponentProps<'svg'>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <rect height="15" rx="4.25" stroke="currentColor" strokeWidth="1.9" width="15" x="4.5" y="4.5" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.2" cy="6.8" fill="currentColor" r="1.05" />
    </svg>
  );
}

export function SiteHeader({
  ctaHref = '/forbussines',
  ctaLabel = 'Стать партнером',
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className="loveresta-header">
      <div className="loveresta-header__inner">
        <Link className="loveresta-brand" href="/">
          <BrandLogo className="loveresta-brand__logo" priority />
        </Link>

        <HeaderNavLinks className="loveresta-nav loveresta-nav--desktop" />

        {ctaHref && ctaLabel ? (
          <div className="loveresta-header__actions loveresta-header__actions--desktop">
            <ActionLink className="loveresta-button loveresta-button--primary" href={ctaHref}>
              {ctaLabel}
            </ActionLink>
          </div>
        ) : null}

        <MobileNavMenu ctaHref={ctaHref} ctaLabel={ctaLabel} links={navLinks} />
      </div>
    </header>
  );
}

export function PickupBanner() {
  return (
    <div className="loveresta-banner">
      <div className="loveresta-banner__content">
        Сюрприз-боксы со скидкой 50–70% из кафе и магазинов рядом.
        Онлайн-оплата — забираете в день заказа.
      </div>
    </div>
  );
}

export function PageShell({
  children,
  ctaHref,
  ctaLabel,
}: {
  children: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="loveresta-app">
      <SiteHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <PickupBanner />
      {children}
      <SiteFooter />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="loveresta-section__heading">
      <span className="loveresta-eyebrow">{eyebrow}</span>
      <h2 className="loveresta-section-title">{title}</h2>
      {description ? <p className="loveresta-section-copy">{description}</p> : null}
    </div>
  );
}

export function CatalogCategories() {
  const categories = ['Все', 'Кафе', 'Рестораны', 'Магазины', 'Пекарни', 'Десерты'];

  return (
    <section className="loveresta-container loveresta-categories">
      <div className="loveresta-chip-row">
        {categories.map((category, index) => (
          <span
            key={category}
            className={`loveresta-chip ${index === 0 ? 'loveresta-chip--active' : ''}`}
          >
            {category}
          </span>
        ))}
      </div>
    </section>
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article className="loveresta-card">
      <div className="loveresta-card__media">
        <div className="loveresta-badge-row">
          <span className="loveresta-badge">{offer.category}</span>
          <span className="loveresta-badge">{offer.pickup}</span>
        </div>
        <div className="loveresta-badge-row">
          <span className="loveresta-badge">{offer.accent}</span>
        </div>
      </div>
      <div className="loveresta-card__body">
        <h3 className="loveresta-card__title">{offer.title}</h3>
        <p className="loveresta-card__subtitle">{offer.description}</p>
        <div className="loveresta-card__footer">
          <div className="loveresta-price">
            <strong>{formatKztPrice(offer.price)}</strong>
            <span>{formatKztPrice(offer.oldPrice)}</span>
          </div>
          <Link className="loveresta-button loveresta-button--primary" href={`/checkout?offer=${offer.id}`}>
            Забрать
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StatStrip() {
  const stats = [
    { value: '120+', label: 'заведений уже доверяют платформе' },
    { value: '50–70%', label: 'средняя скидка на surprise box' },
    { value: '1 минута', label: 'на публикацию бокса в личном кабинете' },
    { value: '0 списаний', label: 'идеальный сценарий для продукта, который успели продать' },
  ];

  return (
    <div className="loveresta-stat-strip">
      {stats.map((stat) => (
        <article key={stat.label} className="loveresta-stat">
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </article>
      ))}
    </div>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  description,
  sideTitle,
  sideCopy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sideTitle: string;
  sideCopy: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <section className="loveresta-container loveresta-marketing-hero">
      <div className="loveresta-surface loveresta-surface--accent">
        <span className="loveresta-eyebrow">{eyebrow}</span>
        <h1 className="loveresta-hero-title">{title}</h1>
        <p className="loveresta-hero-copy">{description}</p>
        <div className="loveresta-cta-row" style={{ marginTop: 24 }}>
          <ActionLink className="loveresta-button loveresta-button--primary" href={primaryHref}>
            {primaryLabel}
          </ActionLink>
          <ActionLink className="loveresta-button loveresta-button--ghost" href={secondaryHref}>
            {secondaryLabel}
          </ActionLink>
        </div>
      </div>
      <aside className="loveresta-surface loveresta-surface__stack">
        <div>
          <span className="loveresta-eyebrow">Почему это работает</span>
          <h2 className="loveresta-section-title">{sideTitle}</h2>
          <p className="loveresta-section-copy">{sideCopy}</p>
        </div>
        <div className="loveresta-surface__stats">
          <div className="loveresta-mini-stat">
            <strong>120+</strong>
            <span>заведений в листе ожидания и каталоге</span>
          </div>
          <div className="loveresta-mini-stat">
            <strong>5.0</strong>
            <span>тон коммуникации и позиционирование по сайту</span>
          </div>
          <div className="loveresta-mini-stat">
            <strong>24/7</strong>
            <span>онлайн-приём заказов без приложения</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

export function ExamplesSection() {
  return (
    <section className="loveresta-container loveresta-section">
      <SectionHeading
        eyebrow="Это привычная мировая практика"
        title="Как это уже работает в других странах"
        description="Во многих странах Европы и США миллионы людей ежедневно покупают еду с коротким сроком годности — не из-за нужды, а из-за осознанного отношения к потреблению."
      />
      <div className="loveresta-grid loveresta-grid--examples">
        {worldExamples.map((example) => (
          <article key={example.title} className="loveresta-card">
            <div className="loveresta-media-panel">
              <Image
                alt={example.title}
                className="loveresta-media-panel__image"
                height={720}
                sizes="(max-width: 900px) 100vw, 30vw"
                src={example.image}
                width={1280}
              />
            </div>
            <div className="loveresta-card__body">
              <h3 className="loveresta-card__title">{example.title}</h3>
              <p className="loveresta-card__subtitle">{example.description}</p>
            </div>
          </article>
        ))}
        <article className="loveresta-card">
          <div className="loveresta-card__body">
            <h3 className="loveresta-card__title">Почему это нормально</h3>
            <ul className="loveresta-list">
              <li>Это вкусно и безопасно.</li>
              <li>Это выгодно: экономия до 70%.</li>
              <li>Это экологично и заметно сокращает отходы.</li>
              <li>Это удобно: всё доступно через веб-сервис.</li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

export function UsersJourneySection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-users-journey-section">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">Пользователям</span>
        <h2 className="loveresta-business-block-heading__title">
          Вы заходите в FOODSAVE и видите боксы, которые кафе, рестораны и магазины
          готовы продать почти по себестоимости. Выбираете, оплачиваете, забираете —
          удобно и экономно.
        </h2>
      </div>

      <UsersJourneyShowcase steps={userJourneySteps} />

      <Link className="loveresta-users-journey-section__cta" href="/">
        Найти еду рядом
      </Link>
    </section>
  );
}

export function UsersBenefitsSection() {
  return (
    <section className="loveresta-container loveresta-section">
      <UsersBenefitsCarousel benefits={userBenefits} />
    </section>
  );
}

export function UsersBoxContentsSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-users-box">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Что может попасться в боксе?
        </span>
        <h2 className="loveresta-business-block-heading__title">
          Чаще всего это готовый набор из 3–5 позиций, собранный заведением по
          внутренним стандартам.
        </h2>
      </div>

      <div className="loveresta-users-box__layout">
        <div className="loveresta-users-box__column loveresta-users-box__column--left">
          <article className="loveresta-users-box__callout">{userBoxCallouts[0]?.text}</article>
          <article className="loveresta-users-box__callout">{userBoxCallouts[1]?.text}</article>
        </div>

        <div className="loveresta-users-box__center">
          <div className="loveresta-users-box__centerVisual">
            <div className="loveresta-users-box__pack">
              <div className="loveresta-users-box__packLogoWrap">
                <BrandLogo className="loveresta-users-box__packLogo" />
              </div>
              <span className="loveresta-users-box__packCountry">KZ BOX</span>
            </div>
            <div className="loveresta-users-box__tag">
              <BrandLogo className="loveresta-users-box__tagLogo" />
              <span className="loveresta-users-box__tagLabel">Бокс</span>
            </div>
          </div>

          <article className="loveresta-users-box__callout loveresta-users-box__callout--bottom">
            {userBoxCallouts[2]?.text}
          </article>
        </div>

        <div className="loveresta-users-box__column loveresta-users-box__column--right">
          <article className="loveresta-users-box__callout">{userBoxCallouts[3]?.text}</article>
          <article className="loveresta-users-box__callout">{userBoxCallouts[4]?.text}</article>
        </div>
      </div>
    </section>
  );
}

export function UsersReviewsSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-user-reviews-section">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Пользователи уже выбирают FOODSAVE
        </span>
        <h2 className="loveresta-business-block-heading__title">
          Отзывы тех, кто уже экономит на боксах и открывает новые места рядом.
        </h2>
      </div>

      <UsersReviewsCarousel reviews={userReviews} />
    </section>
  );
}

export function UsersFaqSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-business-faq">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Часто задаваемые вопросы
        </span>
      </div>

      <div className="loveresta-business-faq__list">
        {userFaqs.map((item) => (
          <details key={item.question} className="loveresta-business-faq__item">
            <summary>
              <span>{item.question}</span>
              <span className="loveresta-business-faq__icon" aria-hidden="true">
                ↓
              </span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function BusinessStepsSection() {
  return <BusinessStepsShowcase steps={businessSteps} />;
}

export function BusinessBenefitsSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-business-value">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Получайте допродажи блюд, которые раньше списывали
        </span>
        <h2 className="loveresta-business-block-heading__title">
          С FOODSAVE заведения в Казахстане превращают остатки еды в дополнительную
          выручку, снижают списания и усиливают доверие гостей.
        </h2>
      </div>

      <div className="loveresta-business-value__grid">
        {businessBenefits.map((benefit: BusinessBenefit) => (
          <article key={benefit.title} className="loveresta-business-value__card">
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BusinessCalculatorSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-business-calc">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Сколько вы теряете на списаниях и сколько можете вернуть
        </span>
        <h2 className="loveresta-business-block-heading__title">
          Пример расчёта для небольшой кофейни в Алматы
        </h2>
      </div>

      <div className="loveresta-business-calc__grid">
        {businessCalculatorMetrics.map((metric) => (
          <article key={metric.label} className="loveresta-business-calc__card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <article className="loveresta-business-calc__result">
        <span>{businessCalculatorResult.label}</span>
        <strong>{businessCalculatorResult.value}</strong>
      </article>
    </section>
  );
}

export function BusinessFaqSection() {
  return (
    <section className="loveresta-container loveresta-section loveresta-business-faq">
      <div className="loveresta-business-block-heading">
        <span className="loveresta-business-block-heading__eyebrow">
          Часто задаваемые вопросы
        </span>
      </div>

      <div className="loveresta-business-faq__list">
        {businessFaqs.map((item) => (
          <details key={item.question} className="loveresta-business-faq__item">
            <summary>
              <span>{item.question}</span>
              <span className="loveresta-business-faq__icon" aria-hidden="true">
                ↓
              </span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function BusinessFinalBanner({ ctaHref = '/register' }: { ctaHref?: string }) {
  return (
    <section className="loveresta-container loveresta-section">
      <article className="loveresta-business-banner">
        <div className="loveresta-business-banner__content">
          <span className="loveresta-business-banner__eyebrow">FOODSAVE Казахстан</span>
          <h2 className="loveresta-business-banner__title">
            Выбирайте разумное потребление. Присоединяйтесь к движению за еду без
            отходов вместе с FOODSAVE.
          </h2>
          <p className="loveresta-business-banner__copy">
            Подключайте заведение в Казахстане и начинайте продавать боксы уже
            сегодня. Подходит для кофеен, пекарен, ресторанов и магазинов.
          </p>
          <div className="loveresta-cta-row">
            <ActionLink className="loveresta-button loveresta-button--primary" href={ctaHref}>
              Стать партнёром
            </ActionLink>
            <ActionLink className="loveresta-button loveresta-button--ghost" href="/">
              Открыть каталог
            </ActionLink>
          </div>
        </div>

        <div className="loveresta-business-banner__visual" aria-hidden="true">
          <div className="loveresta-business-banner__halo" />
          <div className="loveresta-business-banner__box">
            <div className="loveresta-business-banner__logoWrap">
              <BrandLogo className="loveresta-business-banner__logo" />
            </div>
            <span className="loveresta-business-banner__country">KZ</span>
          </div>
          <div className="loveresta-business-banner__chips">
            <span>Алматы</span>
            <span>Астана</span>
            <span>Шымкент</span>
          </div>
        </div>
      </article>
    </section>
  );
}

export function PrivacyArticle() {
  return (
    <section className="loveresta-container loveresta-privacy-article">
      <span className="loveresta-eyebrow">
        Последнее обновление: {privacyLastUpdated}, версия {privacyVersion}
      </span>
      <h1 className="loveresta-privacy-title">ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</h1>
      {privacySections.map((section) => (
        <article key={section.title} className="loveresta-privacy-section" id={section.id}>
          <h2>{section.title}</h2>
          {section.blocks.map((block, blockIndex) =>
            block.type === 'list' ? (
              <ul
                key={`${section.title}-list-${blockIndex}`}
                className="loveresta-privacy-list"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${section.title}-list-item-${blockIndex}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            ) : (
              block.items.map((paragraph, paragraphIndex) => (
                <p key={`${section.title}-paragraph-${blockIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))
            ),
          )}
        </article>
      ))}
    </section>
  );
}

export function AuthPage({
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  forgotPassword = false,
}: {
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  forgotPassword?: boolean;
}) {
  return (
    <PageShell ctaHref="/forbussines" ctaLabel="Стать партнером">
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-auth-shell">
          <div className="loveresta-auth-card">
            <h1>{title}</h1>
            <p className="loveresta-auth-copy">{description}</p>
            <form className="loveresta-form">
              <input className="loveresta-field" placeholder="Email" type="email" />
              <input className="loveresta-field" placeholder="Пароль" type="password" />
              {title === 'Регистрация' ? (
                <input className="loveresta-field" placeholder="Название заведения или имя" type="text" />
              ) : null}
              <div className="loveresta-inline">
                <label className="loveresta-muted">
                  <input defaultChecked type="checkbox" /> Запомнить меня
                </label>
                {forgotPassword ? (
                  <Link className="loveresta-nav__link" href="/reset-password">
                    Забыли пароль
                  </Link>
                ) : null}
              </div>
              <button className="loveresta-button loveresta-button--primary" type="button">
                {submitLabel}
              </button>
            </form>
            <div className="loveresta-auth-actions" style={{ marginTop: 16 }}>
              <button className="loveresta-button loveresta-button--ghost" type="button">
                Apple
              </button>
              <button className="loveresta-button loveresta-button--ghost" type="button">
                Google
              </button>
            </div>
            <p className="loveresta-auth-copy">
              <Link className="loveresta-nav__link" href={alternateHref}>
                {alternateLabel}
              </Link>
            </p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

export function DashboardPage({
  title,
  description,
  actions,
  side,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  side?: React.ReactNode;
}) {
  return (
    <PageShell>
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-dashboard">
          <div className="loveresta-dashboard__grid">
            <article className="loveresta-surface loveresta-dashboard">
              <h1>{title}</h1>
              <p className="loveresta-auth-copy">{description}</p>
              <div className="loveresta-cta-row" style={{ marginTop: 24 }}>
                {actions}
              </div>
            </article>
            <aside className="loveresta-surface">
              {side ?? (
                <>
                  <span className="loveresta-eyebrow">Статус</span>
                  <p className="loveresta-card__subtitle" style={{ marginTop: 0 }}>
                    Маршрут и UI-каркас уже повторяют структуру реального проекта.
                    Дальше здесь можно подключать реальные API и состояния без смены
                    layout.
                  </p>
                </>
              )}
            </aside>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

export function VenueDetailPage({
  venue,
  offers,
}: {
  venue: Venue;
  offers: Offer[];
}) {
  return (
    <PageShell ctaHref="" ctaLabel="">
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-detail">
          <div className="loveresta-detail__grid">
            <article className="loveresta-surface loveresta-detail-card">
              <div className="loveresta-detail-card__logo">
                <div className="loveresta-detail-card__logoInner">
                  <span>{venue.posterWordmark ?? venue.name}</span>
                </div>
              </div>

              <div className="loveresta-detail-card__content">
                <div className="loveresta-detail-card__top">
                  <h1 className="loveresta-detail-card__title">{venue.name}</h1>
                  <div className="loveresta-detail-card__iconRow">
                    <button
                      aria-label="Добавить в избранное"
                      className="loveresta-detail-card__iconButton"
                      type="button"
                    >
                      <Heart size={20} strokeWidth={2.1} />
                    </button>
                    <button
                      aria-label="Поделиться"
                      className="loveresta-detail-card__iconButton"
                      type="button"
                    >
                      <Share2 size={20} strokeWidth={2.1} />
                    </button>
                  </div>
                </div>

                <div className="loveresta-detail-card__addressBox">
                  <div className="loveresta-detail-card__addressContent">
                    <span className="loveresta-detail-card__addressLabel">
                      <MapPin size={15} strokeWidth={2.2} />
                      Адрес самовывоза
                    </span>
                    <strong>{venue.address}</strong>
                  </div>
                  <ChevronDown size={18} strokeWidth={2.2} />
                </div>

                <div className="loveresta-detail-card__meta">
                  <span>
                    <Star size={16} fill="currentColor" strokeWidth={2} />
                    {venue.rating}
                  </span>
                  <span>
                    <Clock3 size={16} strokeWidth={2.1} />
                    {venue.pickupWindow}
                  </span>
                  <span>
                    <Navigation size={16} strokeWidth={2.1} />
                    Самовывоз
                  </span>
                  <button aria-label="Условия получения" type="button">
                    <Info size={16} strokeWidth={2.1} />
                  </button>
                </div>
              </div>
            </article>

            <aside className="loveresta-surface loveresta-detail-telegram">
              <span className="loveresta-eyebrow">Telegram Mini App</span>
              <div className="loveresta-detail-telegram__body">
                <span className="loveresta-detail-telegram__badge">
                  <TelegramIcon className="loveresta-detail-telegram__icon" />
                </span>
                <div className="loveresta-detail-telegram__copy">
                  <strong>Открыть заказ в Telegram</strong>
                  <p>
                    Перейдите в мини-апп FoodSave и оформите заказ напрямую через
                    Telegram.
                  </p>
                </div>
              </div>
              <a
                className="loveresta-detail-telegram__button"
                href="https://t.me/FoodSave_bot"
                rel="noreferrer"
                target="_blank"
              >
                <TelegramIcon className="loveresta-detail-telegram__buttonIcon" />
                Заказать через Telegram Mini App
              </a>
            </aside>
          </div>
        </section>

        <section className="loveresta-container loveresta-section">
          <RecommendedOffersGallery offers={offers} venues={[venue]} />
        </section>
      </main>
    </PageShell>
  );
}

export function CheckoutPage({
  venue,
  selectedOffers,
}: {
  venue: Venue;
  selectedOffers: Offer[];
}) {
  const total = selectedOffers.reduce((sum, offer) => sum + offer.price, 0);

  return (
    <PageShell ctaHref="/order/success" ctaLabel="Оплатить">
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-checkout">
          <div className="loveresta-checkout__grid">
            <article className="loveresta-surface">
              <span className="loveresta-eyebrow">Checkout</span>
              <h1>Онлайн-оплата и самовывоз</h1>
              <p className="loveresta-auth-copy">
                Оставьте контактные данные, оплатите заказ и заберите боксы в
                выбранное окно самовывоза.
              </p>
              <form className="loveresta-form">
                <input className="loveresta-field" placeholder="Имя" type="text" />
                <input className="loveresta-field" placeholder="Телефон" type="tel" />
                <input className="loveresta-field" placeholder="Email" type="email" />
                <select className="loveresta-field" defaultValue={venue.pickupWindow}>
                  <option>{venue.pickupWindow}</option>
                </select>
                <button className="loveresta-button loveresta-button--primary" type="button">
                  Перейти к оплате
                </button>
              </form>
            </article>
            <aside className="loveresta-surface">
              <span className="loveresta-eyebrow">Ваш заказ</span>
              <div className="loveresta-summary-list">
                {selectedOffers.map((offer) => (
                  <div key={offer.id} className="loveresta-summary-item">
                    <div>
                      <strong>{offer.title}</strong>
                      <span>{offer.pickup}</span>
                    </div>
                    <strong>{formatKztPrice(offer.price)}</strong>
                  </div>
                ))}
                <div className="loveresta-summary-item">
                  <div>
                    <strong>{venue.name}</strong>
                    <span>{venue.address}</span>
                  </div>
                </div>
                <div className="loveresta-summary-item">
                  <div>
                    <strong>Итого</strong>
                    <span>Онлайн-оплата и самовывоз в день заказа</span>
                  </div>
                  <strong>{formatKztPrice(total)}</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

export function OrderStatusPage({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <DashboardPage
      title={title}
      description={description}
      actions={
        <>
          <Link className="loveresta-button loveresta-button--primary" href={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="loveresta-button loveresta-button--ghost" href="/">
            Вернуться в каталог
          </Link>
        </>
      }
      side={
        <>
          <span className="loveresta-eyebrow">Состояние заказа</span>
          <div className="loveresta-summary-list">
            <div className="loveresta-summary-item">
              <div>
                <strong>Статус</strong>
                <span>{title}</span>
              </div>
            </div>
            <div className="loveresta-summary-item">
              <div>
                <strong>Следующий шаг</strong>
                <span>{description}</span>
              </div>
            </div>
          </div>
        </>
      }
    />
  );
}

export function OrderDetailsPage({ order, venue }: { order: DemoOrder; venue: Venue }) {
  return (
    <DashboardPage
      title={`Заказ ${order.id}`}
      description="Страница заказа уже заведена в отдельный маршрут и готова к подключению реального статуса из backend."
      actions={
        <>
          <Link className="loveresta-button loveresta-button--primary" href="/orders">
            Ко всем заказам
          </Link>
          <Link className="loveresta-button loveresta-button--ghost" href={`/restaurant/${venue.id}`}>
            Открыть заведение
          </Link>
        </>
      }
      side={
        <>
          <span className="loveresta-eyebrow">Детали</span>
          <div className="loveresta-summary-list">
            <div className="loveresta-summary-item">
              <div>
                <strong>Код получения</strong>
                <span>{order.pickupCode}</span>
              </div>
              <span className="loveresta-order-state">{order.status}</span>
            </div>
            <div className="loveresta-summary-item">
              <div>
                <strong>Окно самовывоза</strong>
                <span>{order.pickupSlot}</span>
              </div>
            </div>
            <div className="loveresta-summary-item">
              <div>
                <strong>Позиции</strong>
                <span>{order.items.join(', ')}</span>
              </div>
              <strong>{formatKztPrice(order.total)}</strong>
            </div>
          </div>
        </>
      }
    />
  );
}

export function SiteFooter() {
  return (
    <footer className="loveresta-footer">
      <div className="loveresta-footer__surface">
        <div className="loveresta-footer__top">
          <div className="loveresta-footer__company">
            <Link className="loveresta-brand" href="/">
              <BrandLogo className="loveresta-brand__logo" />
            </Link>
            <div>Товарищество с ограниченной ответственностью &quot;FoodSave&quot;</div>
            <div>БИН 260240032394</div>
            <div>
              Местонахождение: Казахстан, город Алматы, Ауэзовский район,
              проспект Райымбек, дом 348/2, кв. 218, почтовый индекс 050061
            </div>
          </div>

          <ul className="loveresta-footer__links">
            <li>
              <Link href="/forUsers">О компании</Link>
            </li>
            <li>
              <Link href="/forbussines">Для бизнеса</Link>
            </li>
            <li>
              <Link href="/help">Помощь</Link>
            </li>
          </ul>
        </div>

        <div className="loveresta-footer__payments">
          <Image
            alt="Платежные системы"
            height={120}
            src="/loveresta/images/logos-payments.png"
            width={1080}
          />
        </div>

        <div className="loveresta-footer__bottom">
          <ul className="loveresta-footer__legal">
            <li>
              <span className="loveresta-footer__legalText loveresta-footer__copyright">© foodsave.kz 2025</span>
            </li>
            <li>
              <Link className="loveresta-footer__legalText" href="/privacy">
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link className="loveresta-footer__legalText" href="/privacy#terms">
                Условия использования
              </Link>
            </li>
            <li>
              <Link className="loveresta-footer__legalText" href="/privacy#offer">
                Публичная оферта
              </Link>
            </li>
          </ul>

          <div className="loveresta-footer__social">
            <a
              aria-label="Telegram FoodSave Kazakhstan"
              className="loveresta-social-link"
              href="https://t.me/foodsave_kazakhstan"
              rel="noreferrer"
              target="_blank"
            >
              <TelegramIcon />
            </a>
            <a
              aria-label="Instagram FoodSave Kazakhstan"
              className="loveresta-social-link"
              href="https://www.instagram.com/foodsave_kazakhstan/"
              rel="noreferrer"
              target="_blank"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
