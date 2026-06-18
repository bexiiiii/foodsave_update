import { AuthPage } from '@/components/loveresta/ui';

export default function RegisterPage() {
  return (
    <AuthPage
      alternateHref="/"
      alternateLabel="Вернуться на главную"
      description="Регистрация пользователя или быстрый доступ для бизнеса."
      submitLabel="Регистрация"
      title="Регистрация"
    />
  );
}
