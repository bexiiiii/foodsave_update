import { OrderStatusPage } from '@/components/loveresta/ui';

export default function OrderSuccessPage() {
  return (
    <OrderStatusPage
      description="Оплата прошла успешно. Заберите surprise box в выбранное окно самовывоза."
      primaryHref="/orders/LR-2406"
      primaryLabel="Открыть заказ"
      title="Заказ успешно оформлен"
    />
  );
}
