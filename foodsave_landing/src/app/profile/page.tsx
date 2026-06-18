import Link from 'next/link';

import { DashboardPage } from '@/components/loveresta/ui';

export default function ProfilePage() {
  return (
    <DashboardPage
      title="Профиль"
      description="Каркас профиля уже на месте: здесь появятся адреса, история заказов и настройки аккаунта."
      actions={
        <>
          <Link className="loveresta-button loveresta-button--primary" href="/orders">
            Мои заказы
          </Link>
          <Link className="loveresta-button loveresta-button--ghost" href="/help">
            Помощь
          </Link>
        </>
      }
    />
  );
}
