import type { Metadata } from 'next';
import {
  ExamplesSection,
  MarketingHero,
  PageShell,
  UsersBenefitsSection,
  UsersBoxContentsSection,
  UsersFaqSection,
  UsersJourneySection,
  UsersReviewsSection,
} from '@/components/loveresta/ui';

export const metadata: Metadata = {
  title: 'Пользователям — Еда со скидкой 50–70% в Алматы',
  description:
    'Покупайте сюрприз-боксы из кафе и ресторанов Алматы со скидкой до 70%. Как работает FoodSave: выбрал, оплатил, забрал. Экономьте на еде каждый день.',
  keywords: [
    'купить еду дешево Алматы',
    'как сэкономить на еде',
    'еда со скидкой самовывоз',
    'сюрприз бокс купить',
    'кафе скидки сегодня',
    'рестораны скидка Алматы',
    'food saving Казахстан',
  ],
  alternates: {
    canonical: 'https://foodsave.kz/forUsers',
  },
  openGraph: {
    title: 'Пользователям FoodSave — Еда со скидкой 50–70%',
    description:
      'Покупайте сюрприз-боксы из кафе Алматы со скидкой до 70%. Выбрал — оплатил — забрал.',
    url: 'https://foodsave.kz/forUsers',
  },
};

export default function ForUsersPage() {
  return (
    <PageShell ctaHref="/forbussines" ctaLabel="Стать партнером">
      <main className="loveresta-main">
        <MarketingHero
          description="С нами пользователи получают еду почти по себестоимости, а заведения — избавляются от излишков с пользой. Меньше списаний, больше экономии, еда не пропадает."
          eyebrow="Пользователям"
          primaryHref="/"
          primaryLabel="Найти еду рядом"
          secondaryHref="/forbussines"
          secondaryLabel="Стать партнером"
          sideCopy="Мы — команда разработчиков, дизайнеров и бывших рестораторов. Однажды мы увидели, сколько хорошей еды уходит в мусор просто потому, что её не успели продать вовремя."
          sideTitle="Почему мы создали FOODSAVE"
          title="Спасаем еду, экономим деньги, поддерживаем бизнес"
        />

        <UsersJourneySection />
        <UsersBenefitsSection />
        <UsersBoxContentsSection />
        <ExamplesSection />
        <UsersReviewsSection />
        <UsersFaqSection />
      </main>
    </PageShell>
  );
}
