import { OrderStatusPage } from '@/components/loveresta/ui';

export default function OrderFailPage() {
  return (
    <OrderStatusPage
      description="Платёж не завершился. Можно вернуться в checkout и повторить попытку без изменения структуры заказа."
      primaryHref="/checkout"
      primaryLabel="Вернуться к оплате"
      title="Оплата не завершена"
    />
  );
}
