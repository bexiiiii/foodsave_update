import type { GrowthArm, GrowthCohort } from '@/types/growthExperiments';

export const MAX_PREVIEW_ID = Number.MAX_SAFE_INTEGER;

export function parsePreviewId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= MAX_PREVIEW_ID ? id : null;
}

export const cohortLabels: Record<GrowthCohort, string> = {
  NEVER_CLEAN: 'Без чистых заказов',
  ONE_CLEAN_RECENT: 'Один чистый заказ, менее 8 дней назад',
  ONE_CLEAN_LAPSED: 'Один чистый заказ, 8+ дней назад',
  REPEAT_LAPSED: 'Два и более чистых заказа, 8+ дней назад',
};

export const armLabels: Record<GrowthArm, string> = {
  TREATMENT: 'Воздействие',
  HOLDOUT: 'Контроль (без рассылки)',
};

const reasonLabels: Record<string, string> = {
  GLOBAL_DISABLED: 'Глобальная отправка экспериментов выключена',
  EXPERIMENT_DISABLED: 'Эксперимент выключен',
  EXPERIMENT_NOT_FOUND: 'Эксперимент не найден',
  LEGACY_MARKETING_ENABLED: 'Действующая маркетинговая рассылка не изолирована',
  ASSIGNMENT_NOT_FOUND: 'Пользователь не включён в эксперимент',
  ASSIGNMENT_EXPIRED: 'Окно воздействия для пользователя завершено',
  HOLDOUT: 'Контрольная группа: отправка запрещена',
  ALREADY_CLAIMED: 'Попытка отправки уже зарегистрирована',
  USER_UNAVAILABLE: 'Пользователь недоступен для отправки',
  TELEGRAM_UNAVAILABLE: 'Telegram недоступен',
  CONSENT_MISSING: 'Нет подтверждённых настроек согласия',
  OPTED_OUT: 'Пользователь отключил нужный тип уведомлений',
  INVALID_PREFERENCES: 'Настройки пользователя некорректны',
  QUIET_HOURS: 'Сейчас тихие часы',
  GPS_MISSING: 'Нет подтверждённой геопозиции',
  GPS_STALE: 'Геопозиция устарела',
  STORE_LOCATION_MISSING: 'Нет координат заведения',
  OUTSIDE_RADIUS: 'Бокс за пределами разрешённого радиуса',
  PRODUCT_UNAVAILABLE: 'Бокс недоступен или закончился',
  PRODUCT_EXPIRED: 'Срок годности не подходит для отправки',
  STORE_UNAVAILABLE: 'Заведение недоступно',
  PRICE_PREFERENCE: 'Цена или скидка не соответствуют предпочтениям',
  PICKUP_UNVERIFIED: 'Окно выдачи не подтверждено',
  PICKUP_VERIFICATION_STALE: 'Подтверждение окна выдачи устарело',
  PICKUP_WINDOW_INVALID: 'Окно выдачи некорректно',
  PICKUP_TOO_SOON: 'Недостаточно времени, чтобы забрать заказ',
  SUPPRESSED: 'Для пользователя действует пауза уведомлений',
  UNOPENED_LIMIT: 'Достигнут лимит неоткрытых уведомлений',
  DAILY_CAP: 'Достигнут дневной лимит отправок',
  MINIMUM_GAP: 'Не выдержан интервал между отправками',
  INVALID_FREQUENCY_STATE: 'Невозможно надёжно проверить частоту отправок',
};

export function growthReasonLabel(reason: string): string {
  return reasonLabels[reason] ?? 'Неизвестная причина ограничения; нужна проверка сервера';
}

export function formatGrowthCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('ru-KZ') : 'Недоступно';
}

// ITT always uses every assigned user, and is withheld until the whole group matures.
export function formatGrowthItt(rate: number | null, assigned: number, mature: number): string {
  if (!Number.isFinite(assigned) || !Number.isFinite(mature)) return 'Недоступно';
  if (assigned === 0) return 'Нет участников';
  if (mature < assigned) return 'Ожидает созревания всей группы';
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1 || mature !== assigned) return 'Недоступно';
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatGrowthDate(value: string | null, timeZone = 'UTC'): string {
  if (value === null) return 'Нет';
  try {
    return new Intl.DateTimeFormat('ru-KZ', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value));
  } catch {
    return 'Недоступно';
  }
}
