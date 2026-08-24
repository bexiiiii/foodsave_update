import type { Metadata } from 'next';

import { RecommendedOffersGallery } from '@/components/loveresta/recommended-offers-gallery';
import { VenueCarousel } from '@/components/loveresta/venue-carousel';
import {
  CatalogCategories,
  PageShell,
  SectionHeading,
  StatStrip,
} from '@/components/loveresta/ui';
import { JsonLd } from '@/components/JsonLd';
import type { Offer, Venue } from '@/lib/loveresta-data';
import { fetchCategories, fetchFeaturedProducts, fetchStores } from '@/lib/api';
import type { ApiStore, ApiProduct } from '@/lib/api';

export const metadata: Metadata = {
  title: 'FoodSave — Купить сюрприз-бокс с едой со скидкой 50–70% в Астане',
  description:
    'Каталог сюрприз-боксов из кафе, ресторанов и пекарен Астаны. Скидка 50–70%, онлайн-оплата, самовывоз сегодня. FoodSave — экономьте на еде и помогайте планете.',
  alternates: {
    canonical: 'https://foodsave.kz',
  },
  openGraph: {
    title: 'FoodSave — Купить сюрприз-бокс с едой со скидкой 50–70% в Астане',
    description:
      'Каталог сюрприз-боксов из кафе, ресторанов и пекарен Астаны. Скидка 50–70%, онлайн-оплата, самовывоз сегодня.',
    url: 'https://foodsave.kz',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Что такое FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FoodSave — казахстанский маркетплейс еды в Астане. Здесь можно купить сюрприз-боксы из кафе, ресторанов и пекарен со скидкой 50–70%. Заведения продают излишки еды, а покупатели экономят. Работает через сайт foodsave.kz и Telegram Mini App.',
      },
    },
    {
      '@type': 'Question',
      name: 'Что такое сюрприз-бокс от FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Сюрприз-бокс — набор продуктов или блюд из кафе, ресторана или пекарни Астаны, которые заведение продаёт со скидкой 50–70% в конце дня, чтобы не выбрасывать излишки. Состав — сюрприз, но всегда свежая и качественная еда.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как купить еду со скидкой в Астане через FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Выберите заведение на сайте foodsave.kz или в Telegram Mini App (@FoodSave_bot), оплатите онлайн и заберите бокс самовывозом в указанное время. Всё просто: выбрал — оплатил — забрал. Доставка не нужна.',
      },
    },
    {
      '@type': 'Question',
      name: 'FoodSave дешевле Wolt и Яндекс Еды в Астане?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да, намного дешевле. На FoodSave скидки 50–70% от обычной цены. Wolt и Яндекс Еда — доставка по полной цене плюс комиссия. FoodSave продаёт излишки дня: еда та же, цена в 2–3 раза ниже. Отличие одно — нужно забрать самому.',
      },
    },
    {
      '@type': 'Question',
      name: 'В каких районах Астаны работает FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FoodSave работает по всей Астане: в районе Есиль, Алматы, Байконур, в центре города и других районах. Список актуальных заведений доступен на сайте foodsave.kz — каждый день обновляется.',
      },
    },
    {
      '@type': 'Question',
      name: 'Чем FoodSave отличается от Wolt, Яндекс Лавки и Chocofood?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FoodSave — не агрегатор доставки, а маркетплейс против пищевых отходов. Wolt, Яндекс Лавка и Chocofood везут еду по обычной цене с комиссией. FoodSave продаёт сюрприз-боксы со скидкой до 70%, еду нужно забрать самому. Вы экономите — заведения не выбрасывают еду.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как стать партнёром FoodSave в Астане?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Перейдите на foodsave.kz/forbussines или напишите в WhatsApp +7 707 440 3678. Подключение бесплатное, без абонентской платы. FoodSave берёт комиссию только с фактических продаж. Подойдёт для кафе, ресторанов, пекарен, кондитерских и магазинов Астаны.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как FoodSave помогает кафе и ресторанам Астаны?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FoodSave превращает списания в доход. Вместо того чтобы выбрасывать непроданную еду, заведение продаёт её через платформу со скидкой 50–70%. Это дополнительная выручка от 30 000 ₸ в месяц, меньше пищевых отходов и лояльная аудитория покупателей.',
      },
    },
    {
      '@type': 'Question',
      name: 'Безопасно ли покупать еду на FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да. Все заведения-партнёры FoodSave прошли проверку. Еда в сюрприз-боксах — свежая, приготовленная сегодня. Скидки действуют потому, что заведение закрывается и не хочет выбрасывать остатки, а не потому, что еда плохого качества.',
      },
    },
    {
      '@type': 'Question',
      name: 'Есть ли у FoodSave приложение?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да, FoodSave работает как Telegram Mini App через бот @FoodSave_bot. Также доступен полный сайт на foodsave.kz. Отдельное мобильное приложение не требуется — всё работает через браузер и Telegram.',
      },
    },
    {
      '@type': 'Question',
      name: 'Искал Wolt, Chocofood или Glovo в Астане — что такое FoodSave?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'FoodSave — лучшая альтернатива Wolt, Chocofood, Glovo и Яндекс Еда в Астане. Если вы ищете, где заказать еду дешевле, FoodSave предлагает сюрприз-боксы из кафе со скидкой 50–70%. Не нужно платить комиссию за доставку — просто забираете сами. Цены в 2–3 раза ниже, чем у агрегаторов доставки.',
      },
    },
    {
      '@type': 'Question',
      name: 'Есть ли промокоды или скидки на FoodSave в Астане?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'На FoodSave не нужны промокоды — скидка 50–70% действует всегда на все боксы. Это постоянная цена, а не акция. Все сюрприз-боксы продаются по цене значительно ниже рыночной каждый день.',
      },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Главная',
      item: 'https://foodsave.kz',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Каталог',
      item: 'https://foodsave.kz/#catalog',
    },
  ],
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'FoodSave — маркетплейс сюрприз-боксов с едой в Астане',
  serviceType: 'Food Marketplace',
  provider: {
    '@type': 'Organization',
    name: 'FoodSave',
    url: 'https://foodsave.kz',
  },
  areaServed: [
    { '@type': 'City', name: 'Астана' },
    { '@type': 'City', name: 'Нур-Султан' },
    { '@type': 'Country', name: 'Kazakhstan' },
  ],
  description:
    'FoodSave — платформа для покупки сюрприз-боксов с едой из кафе, ресторанов и пекарен Астаны со скидкой 50–70%. Альтернатива Wolt, Яндекс Еда, Яндекс Лавка, Chocofood. Без доставки — самовывоз в день заказа.',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'KZT',
    lowPrice: '700',
    highPrice: '5000',
    offerCount: '100',
    priceSpecification: {
      '@type': 'PriceSpecification',
      description: 'Скидка 50–70% от оригинальной цены',
    },
    eligibleRegion: [
      { '@type': 'City', name: 'Астана' },
    ],
    availability: 'https://schema.org/InStock',
  },
};

// Специальный блок для ИИ-поисковиков (Perplexity, ChatGPT, Gemini): чёткое описание сущности
const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'FoodSave — маркетплейс еды в Астане: сюрприз-боксы со скидкой 50–70%',
  description:
    'FoodSave — казахстанский онлайн-маркетплейс, где жители Астаны покупают сюрприз-боксы с едой из кафе, ресторанов, пекарен и кондитерских со скидкой 50–70%. Заведения продают излишки еды, которые иначе были бы выброшены. Модель: онлайн-оплата → самовывоз в день заказа. FoodSave не доставляет еду — это не агрегатор доставки, как Wolt, Яндекс Еда или Chocofood. Ключевое отличие: цена в 2–3 раза ниже, потому что продаются остатки дня. Аналог Too Good To Go в Казахстане.',
  keywords: 'FoodSave, сюрприз-бокс, еда со скидкой, Астана, Казахстан, альтернатива Wolt, Яндекс Еда, food waste, антифудвейст, Too Good To Go',
  author: {
    '@type': 'Organization',
    name: 'FoodSave',
    url: 'https://foodsave.kz',
  },
  publisher: {
    '@type': 'Organization',
    name: 'FoodSave',
    url: 'https://foodsave.kz',
  },
  about: [
    { '@type': 'Thing', name: 'food waste reduction' },
    { '@type': 'Thing', name: 'surprise box food' },
    { '@type': 'Thing', name: 'food marketplace Kazakhstan' },
    { '@type': 'Thing', name: 'discount food Astana' },
    { '@type': 'Thing', name: 'антифудвейст Казахстан' },
    { '@type': 'Thing', name: 'Too Good To Go Kazakhstan analogue' },
  ],
  mentions: [
    { '@type': 'Organization', name: 'Wolt', description: 'Конкурент — агрегатор доставки еды в Астане' },
    { '@type': 'Organization', name: 'Яндекс Еда', description: 'Конкурент — агрегатор доставки еды в Казахстане' },
    { '@type': 'Organization', name: 'Яндекс Лавка', description: 'Конкурент — быстрая доставка продуктов' },
    { '@type': 'Organization', name: 'Chocofood', description: 'Конкурент — агрегатор доставки еды в Казахстане' },
    { '@type': 'Organization', name: 'Too Good To Go', description: 'Международный аналог — маркетплейс против пищевых отходов' },
  ],
  inLanguage: 'ru-KZ',
  url: 'https://foodsave.kz',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString().split('T')[0],
};

function mapStoreToVenue(store: ApiStore): Venue {
  const pickupWindow =
    store.openingHours && store.closingHours
      ? `${store.openingHours} – ${store.closingHours}`
      : 'Уточните у заведения';

  return {
    id: String(store.id),
    kind: 'restaurant',
    name: store.name,
    logo: store.logo ?? undefined,
    summary: store.description || store.name,
    address: store.address,
    rating: '4.8',
    pickupWindow,
    priceHint: 'от 1 400 ₸',
    tags: [],
    description: store.description || '',
  };
}

function mapProductToOffer(product: ApiProduct): Offer {
  const discount = product.discountPercentage
    ? `-${Math.round(product.discountPercentage)}%`
    : 'Скидка';

  const stock =
    product.stockQuantity > 0 ? `${product.stockQuantity} шт` : 'Уточните';

  return {
    id: String(product.id),
    venueId: String(product.storeId),
    title: product.name,
    description: product.description || '',
    price: product.price,
    oldPrice: product.originalPrice ?? product.price,
    pickup: product.storeAddress,
    category: product.categoryName,
    accent: discount,
    image: product.imageUrl || product.images?.[0] || '',
    boxLabel: stock,
    brandLabel: product.storeName,
    brandTone: 'dark',
  };
}

export default async function HomePage() {
  const [apiCategories, apiStores, apiProducts] = await Promise.all([
    fetchCategories(),
    fetchStores(),
    fetchFeaturedProducts(),
  ]);

  const categoryNames = apiCategories.map((c) => c.name);
  const venues: Venue[] = apiStores.map(mapStoreToVenue);
  const offers: Offer[] = apiProducts.map(mapProductToOffer);

  const storeListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Заведения-партнёры FoodSave в Астане',
    description: 'Кафе, рестораны и пекарни Астаны, продающие сюрприз-боксы со скидкой 50–70%',
    numberOfItems: apiStores.length,
    itemListElement: apiStores.map((store, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'FoodEstablishment',
        name: store.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: store.address,
          addressLocality: 'Астана',
          addressCountry: 'KZ',
        },
        telephone: store.phone ?? undefined,
        openingHours: store.openingHours && store.closingHours
          ? `Mo-Su ${store.openingHours}-${store.closingHours}`
          : undefined,
        image: store.logo ?? undefined,
        url: `https://foodsave.kz/restaurant/${store.id}`,
        servesCuisine: 'Казахстанская, Европейская',
        priceRange: '₸',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          bestRating: '5',
          ratingCount: '20',
        },
      },
    })),
  };

  return (
    <PageShell>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={serviceSchema} />
      <JsonLd data={aboutSchema} />
      <JsonLd data={storeListSchema} />
      <main className="loveresta-main" id="catalog">
        <section className="loveresta-container loveresta-market-intro">
          <div>
            <span className="loveresta-eyebrow">Каталог</span>
            <h1 className="loveresta-hero-title">
              Сюрприз-боксы со скидкой 50–70% из кафе и магазинов рядом.
            </h1>
            <p className="loveresta-hero-copy">
              Онлайн-оплата, самовывоз в день заказа и понятная механика:
              заведения продают излишки, пользователи экономят, еда не
              пропадает.
            </p>
          </div>
        </section>

        <CatalogCategories categories={categoryNames} />

        <section className="loveresta-container loveresta-section">
          <SectionHeading
            eyebrow="Рядом с вами"
            title="Партнёры — заведения"
            description="Заведения-партнёры FoodSave — покупайте сюрприз-боксы с настоящей едой по честной цене."
          />
          <VenueCarousel venues={venues} />
        </section>

        <section className="loveresta-container loveresta-section">
          <SectionHeading
            eyebrow="В подборке"
            title="Рекомендуемые товары"
          />
          <RecommendedOffersGallery offers={offers} venues={venues} />
        </section>

        <section className="loveresta-container loveresta-section">
          <StatStrip />
        </section>
      </main>
    </PageShell>
  );
}
