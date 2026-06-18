import type { Metadata } from 'next';

import { PageShell, PrivacyArticle } from '@/components/loveresta/ui';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | FoodSave',
  description:
    'Порядок обработки персональных данных пользователей, партнёров и посетителей платформы FoodSave.',
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <main className="loveresta-main">
        <PrivacyArticle />
      </main>
    </PageShell>
  );
}
