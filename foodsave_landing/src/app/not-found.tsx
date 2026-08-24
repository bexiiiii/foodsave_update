import type { Metadata } from 'next';
import Link from 'next/link';

import { PageShell } from '@/components/loveresta/ui';

export const metadata: Metadata = {
  title: 'Страница не найдена',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <PageShell>
      <main className="loveresta-main">
        <section className="loveresta-container loveresta-not-found">
          <div className="loveresta-not-found__content">
            <span className="loveresta-eyebrow">Ошибка 404</span>
            <h1 className="loveresta-not-found__title">404</h1>
            <p className="loveresta-not-found__subtitle">Страница не найдена</p>
            <p className="loveresta-not-found__copy">
              Возможно, ссылка устарела или была удалена.
              Но у нас ещё есть вкусные боксы со скидкой 50–70%.
            </p>
            <div className="loveresta-not-found__actions">
              <Link className="loveresta-button loveresta-button--primary" href="/">
                Перейти в каталог
              </Link>
              <Link className="loveresta-button loveresta-button--ghost" href="/forUsers">
                Узнать о FoodSave
              </Link>
            </div>
          </div>

          <div className="loveresta-not-found__visual" aria-hidden="true">
            <div className="loveresta-not-found__box">
              <span>?</span>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
