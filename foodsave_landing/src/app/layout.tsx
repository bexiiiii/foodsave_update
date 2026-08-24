import type { Metadata, Viewport } from 'next';
import { Inter, Unbounded } from 'next/font/google';

import { JsonLd } from '@/components/JsonLd';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
});

const siteUrl = 'https://foodsave.kz';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FoodSave — Сюрприз-боксы со скидкой 50–70% из кафе и ресторанов Астаны',
    template: '%s | FoodSave',
  },
  description:
    'FoodSave — маркетплейс еды в Астане. Покупайте сюрприз-боксы из кафе, ресторанов и пекарен со скидкой 50–70%. Самовывоз в день заказа. Альтернатива Wolt, Яндекс Еда, Chocofood.',
  keywords: [
    // Бренд
    'FoodSave',
    'foodsave.kz',
    'ФудСейв',
    'фудсейв Астана',
    'FoodSave Kazakhstan',

    // Продукт — основные
    'сюрприз-бокс еда',
    'сюрприз бокс купить Астана',
    'сюрприз бокс кафе',
    'surprise box еда',
    'набор еды со скидкой',
    'бокс с едой Астана',

    // Астана — геолокация
    'еда со скидкой Астана',
    'купить еду дешево Астана',
    'кафе скидки Астана',
    'рестораны скидка Астана',
    'пекарня скидка Астана',
    'еда на вынос Астана',
    'самовывоз еда Астана',
    'еда по себестоимости Астана',
    'дешевая еда Астана',
    'готовая еда Астана недорого',
    'еда в Астане дешево сегодня',
    'заказать еду Астана онлайн',
    'где поесть дешево Астана',
    'скидки на еду Астана сегодня',
    'еда навынос Астана',
    'кофейня со скидкой Астана',
    'ресторан остатки еда Астана',

    // Нур-Султан (старое название Астаны)
    'еда со скидкой Нур-Султан',
    'кафе скидки Нур-Султан',
    'купить еду Нур-Султан',

    // Казахстан общее
    'еда со скидкой Казахстан',
    'заказать еду онлайн Казахстан',
    'маркетплейс еды Казахстан',
    'онлайн магазин еды Казахстан',
    'продукты со скидкой Казахстан',
    'еда дешево Казахстан',

    // Конкуренты — Wolt (люди ищут Wolt, найдут нас)
    'альтернатива Wolt Астана',
    'дешевле Wolt Астана',
    'Wolt Астана скидка',
    'Wolt Астана акции',
    'Wolt Казахстан дешевле',
    'вместо Wolt Астана',
    'Wolt не доступен',
    'Wolt промокод Астана',

    // Конкуренты — Яндекс Еда / Лавка
    'альтернатива Яндекс Еда Астана',
    'альтернатива Яндекс Лавка Астана',
    'Яндекс Еда Астана скидки',
    'дешевле Яндекс Еда Казахстан',
    'вместо Яндекс Еды Астана',
    'Яндекс Еда промокод Астана',

    // Конкуренты — Chocofood
    'альтернатива Chocofood',
    'Chocofood скидки Астана',
    'Chocofood дешевле',
    'вместо Chocofood Астана',
    'Chocofood промокод',

    // Конкуренты — Glovo
    'альтернатива Glovo Астана',
    'Glovo Астана дешевле',
    'вместо Glovo',

    // Too Good To Go (международный аналог)
    'Too Good To Go Казахстан',
    'Too Good To Go Астана',
    'аналог Too Good To Go',

    // Общие конкурентные
    'доставка еды дешевле Астана',
    'самая дешевая доставка еды Астана',
    'еда без комиссии Астана',

    // Голосовые запросы (voice search)
    'где купить дешевую еду в Астане',
    'как сэкономить на еде в Астане',
    'где взять еду со скидкой в Астане',
    'куда пойти за дешевой едой в Астане',

    // Бизнес-запросы (B2B)
    'подключить кафе к агрегатору Астана',
    'продать излишки еды ресторан',
    'уменьшить пищевые отходы ресторан',
    'дополнительная выручка кафе Астана',
    'партнёрство ресторан Казахстан',
    'как подключить ресторан FoodSave',
    'агрегатор еды для кафе Астана',

    // Экология / sustainability
    'борьба с пищевыми отходами Казахстан',
    'food waste Казахстан',
    'антифудвейст',
    'food saving',
    'излишки еды купить',
    'экологичная еда Астана',
    'zero waste еда',

    // Казахский язык
    'Астана тамақ',
    'арзан тамақ Астана',
    'тамақ жеңілдік Астана',

    // Информационные запросы
    'что такое сюрприз бокс с едой',
    'как работает FoodSave',
    'фудвейст что это',
    'пищевые отходы кафе продать',
    'скидки в кафе конец дня Астана',
    'еда по скидке забрать самому',
  ],
  authors: [{ name: 'FoodSave', url: siteUrl }],
  creator: 'FoodSave',
  publisher: 'FoodSave',
  category: 'food',
  applicationName: 'FoodSave',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    url: siteUrl,
    siteName: 'FoodSave',
    title: 'FoodSave — Сюрприз-боксы со скидкой 50–70% из кафе Астаны',
    description:
      'Покупайте сюрприз-боксы из кафе, ресторанов и пекарен Астаны со скидкой 50–70%. Дешевле Wolt и Яндекс Еды. Онлайн-оплата, самовывоз сегодня.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FoodSave — маркетплейс еды в Астане',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FoodSave — Сюрприз-боксы со скидкой 50–70% в Астане',
    description:
      'Покупайте сюрприз-боксы из кафе и ресторанов Астаны со скидкой до 70%. Самовывоз в день заказа.',
    images: ['/og-image.jpg'],
    creator: '@foodsave_kz',
    site: '@foodsave_kz',
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      'ru-KZ': siteUrl,
      'kk-KZ': siteUrl,
    },
  },
  verification: {
    google: 'REPLACE_WITH_GOOGLE_VERIFICATION_TOKEN',
    yandex: 'REPLACE_WITH_YANDEX_VERIFICATION_TOKEN',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f9fff5',
  width: 'device-width',
  initialScale: 1,
};

// Organization — главная сущность, E-E-A-T сигналы
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'FoodSave',
  alternateName: ['ФудСейв', 'Food Save KZ', 'FoodSave Kazakhstan', 'FoodSave Астана'],
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${siteUrl}/logo.png`,
    width: 512,
    height: 512,
  },
  image: `${siteUrl}/og-image.jpg`,
  description:
    'FoodSave — казахстанский маркетплейс сюрприз-боксов с едой. Покупайте излишки из кафе, ресторанов и пекарен Астаны со скидкой 50–70%. Лучшая альтернатива Wolt, Яндекс Еда, Яндекс Лавка и Chocofood.',
  foundingDate: '2024',
  foundingLocation: {
    '@type': 'Place',
    name: 'Астана, Казахстан',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Астана',
      addressCountry: 'KZ',
    },
  },
  areaServed: [
    { '@type': 'City', name: 'Астана', sameAs: 'https://www.wikidata.org/wiki/Q19655' },
    { '@type': 'City', name: 'Нур-Султан' },
    { '@type': 'Country', name: 'Казахстан', sameAs: 'https://www.wikidata.org/wiki/Q232' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Астана',
    addressRegion: 'Астана',
    addressCountry: 'KZ',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Russian', 'Kazakh'],
      url: `${siteUrl}/help`,
    },
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      url: `${siteUrl}/forbussines`,
    },
  ],
  sameAs: [
    'https://t.me/FoodSave_kz',
    'https://instagram.com/foodsave.kz',
  ],
  knowsAbout: [
    'food waste reduction',
    'surprise box food',
    'food marketplace Kazakhstan',
    'discount food Astana',
    'антифудвейст',
    'сюрприз-боксы с едой',
    'борьба с пищевыми отходами',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Сюрприз-боксы из кафе Астаны',
    url: `${siteUrl}/#catalog`,
  },
};

// LocalBusiness — критично для локального SEO в Google/Яндекс/2GIS
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'FoodEstablishment'],
  '@id': `${siteUrl}/#localbusiness`,
  name: 'FoodSave',
  description:
    'Онлайн-маркетплейс сюрприз-боксов с едой из кафе и ресторанов Астаны. Скидка 50–70%, самовывоз.',
  url: siteUrl,
  telephone: '+77074403678',
  priceRange: '₸',
  currenciesAccepted: 'KZT',
  paymentAccepted: 'Онлайн-оплата (карта)',
  openingHours: 'Mo-Su 07:00-23:00',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Астана',
    addressRegion: 'Астана',
    addressCountry: 'KZ',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 51.1801,
    longitude: 71.446,
  },
  hasMap: 'https://maps.google.com/?q=Астана,Казахстан',
  image: `${siteUrl}/og-image.jpg`,
  logo: `${siteUrl}/logo.png`,
  servesCuisine: ['Казахская', 'Европейская', 'Азиатская', 'Фастфуд', 'Выпечка'],
  menu: siteUrl,
  sameAs: ['https://t.me/FoodSave_kz'],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    bestRating: '5',
    worstRating: '1',
    ratingCount: '120',
  },
};

// WebSite + SearchAction
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: 'FoodSave',
  url: siteUrl,
  description:
    'Маркетплейс еды в Астане: сюрприз-боксы со скидкой 50–70% из кафе и ресторанов. Самовывоз в день заказа.',
  inLanguage: ['ru-KZ', 'kk-KZ'],
  publisher: { '@id': `${siteUrl}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// MobileApplication — для поисковых запросов по Telegram Mini App
const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'FoodSave Telegram Mini App',
  description:
    'Заказывайте сюрприз-боксы со скидкой 50–70% прямо в Telegram. Кафе и рестораны Астаны.',
  operatingSystem: 'Telegram',
  applicationCategory: 'FoodApplication',
  url: 'https://t.me/FoodSave_bot',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KZT',
    description: 'Бесплатное использование',
  },
  author: { '@id': `${siteUrl}/#organization` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        {/* Geo — Астана */}
        <meta name="geo.region" content="KZ-AST" />
        <meta name="geo.placename" content="Астана, Казахстан" />
        <meta name="geo.position" content="51.1801;71.4460" />
        <meta name="ICBM" content="51.1801, 71.4460" />

        {/* Дополнительные языки */}
        <link rel="alternate" hrefLang="ru-kz" href={siteUrl} />
        <link rel="alternate" hrefLang="kk-kz" href={siteUrl} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />

        {/* Structured Data */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={localBusinessSchema} />
        <JsonLd data={websiteSchema} />
        <JsonLd data={appSchema} />
      </head>
      <body className={`${inter.variable} ${unbounded.variable}`}>
        {children}
      </body>
    </html>
  );
}
