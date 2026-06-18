import { DashboardPage } from '@/components/loveresta/ui';

export default function ResetPasswordPage() {
  return (
    <DashboardPage
      title="Сброс пароля"
      description="Оставьте email и получите ссылку для восстановления доступа. Маршрут уже заведён отдельно, чтобы дальше без миграции добавить настоящую форму."
    />
  );
}
