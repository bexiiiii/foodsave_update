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
