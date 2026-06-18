import { RecommendedOffersGallery } from '@/components/loveresta/recommended-offers-gallery';
import { VenueCarousel } from '@/components/loveresta/venue-carousel';
import {
  CatalogCategories,
  PageShell,
  SectionHeading,
  StatStrip,
} from '@/components/loveresta/ui';
import { offers, venues } from '@/lib/loveresta-data';

export default function HomePage() {
  return (
    <PageShell>
      <main className="loveresta-main">
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

        <CatalogCategories />

        <section className="loveresta-container loveresta-section">
          <SectionHeading
            eyebrow="Рядом с вами"
            title="Заведение"
           
          />
          <VenueCarousel venues={venues} />
        </section>

        <section className="loveresta-container loveresta-section">
          <SectionHeading
            eyebrow="В подборке"
            title="Рекомендуемые товары"
            description="Открывайте карточку товара в модальном окне, проверяйте самовывоз и переходите к оформлению только когда готовы."
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
