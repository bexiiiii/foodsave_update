import {
  BusinessBenefitsSection,
  BusinessCalculatorSection,
  BusinessFaqSection,
  BusinessFinalBanner,
  BusinessStepsSection,
  MarketingHero,
  PageShell,
  StatStrip,
} from '@/components/loveresta/ui';

export default function ForBusinessPage() {
  const partnerWhatsappHref = 'https://wa.me/77074403678';

  return (
    <PageShell ctaHref={partnerWhatsappHref} ctaLabel="Стать партнёром">
      <main className="loveresta-main">
        <MarketingHero
          description="С нами пользователи получают еду почти по себестоимости, а заведения — избавляются от излишков с пользой. Подключите заведение и начните продавать сегодня."
          eyebrow="Бизнесу"
          primaryHref={partnerWhatsappHref}
          primaryLabel="Стать партнером"
          secondaryHref="/"
          secondaryLabel="Смотреть каталог"
          sideCopy="То, что вы списываете — не потери. Это нереализованный доход. FOODSAVE превращает остатки еды в дополнительную выручку и экологическую репутацию."
          sideTitle="120+ заведений нам уже доверяют"
          title="Спасаем еду, экономим деньги, поддерживаем бизнес"
        />

        <section className="loveresta-container loveresta-section">
          <StatStrip />
        </section>

        <BusinessStepsSection />
        <BusinessBenefitsSection />
        <BusinessCalculatorSection />
        <BusinessFaqSection />
        <BusinessFinalBanner ctaHref={partnerWhatsappHref} />
      </main>
    </PageShell>
  );
}
