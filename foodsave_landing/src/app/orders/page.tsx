import Link from 'next/link';

import { DashboardPage } from '@/components/loveresta/ui';
import { demoOrders } from '@/lib/loveresta-data';

export default function OrdersPage() {
  const order = demoOrders[0];

  return (
    <DashboardPage
      title="Заказы"
      description="Маршрут списка заказов повторяет структуру оригинального приложения и уже связан с отдельной страницей заказа."
      actions={
        <>
          <Link className="loveresta-button loveresta-button--primary" href={`/orders/${order.id}`}>
            Открыть демо-заказ
          </Link>
          <Link className="loveresta-button loveresta-button--ghost" href="/">
            Вернуться в каталог
          </Link>
        </>
      }
    />
  );
}
