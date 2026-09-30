import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import type { GrowthAssignmentPreview, GrowthDispatchPreview, GrowthExperiment, GrowthMeasurement } from '@/types/growthExperiments';

const base = '/admin/growth-experiments';

function requireArray<T>(data: T[]): T[] {
  if (!Array.isArray(data)) throw new Error('Invalid growth API response');
  return data;
}

// Deliberately no create, enroll, enable, pickup verification or send methods.
export const growthExperimentsApi = {
  list: (signal?: AbortSignal) =>
    api.get<GrowthExperiment[]>(base, { signal, params: { limit: 100 } }).then(({ data }) => requireArray(data)),
  get: (id: string, signal?: AbortSignal) =>
    api.get<GrowthExperiment>(`${base}/${encodeURIComponent(id)}`, { signal }).then(({ data }) => data),
  measurements: (id: string, signal?: AbortSignal) =>
    api.get<GrowthMeasurement[]>(`${base}/${encodeURIComponent(id)}/measurements`, { signal }).then(({ data }) => requireArray(data)),
  preview: (id: string, userId: number) =>
    api.post<GrowthAssignmentPreview>(`${base}/${encodeURIComponent(id)}/preview`, { userId }).then(({ data }) => data),
  dispatchPreview: (id: string, userId: number, productId: number) =>
    api.post<GrowthDispatchPreview>(`${base}/${encodeURIComponent(id)}/dispatch-preview`, { userId, productId }).then(({ data }) => data),
};

export function growthApiError(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401 || status === 403) return 'Доступ разрешён только супер-администратору. Проверьте сессию.';
  if (status === 400) return 'Проверьте ID: эксперимент, пользователь или бокс не найдены либо параметры недопустимы.';
  if (status === 404) return 'Эксперимент или API недоступны. Проверьте выбранный эксперимент и версию сервера.';
  if (status === 409) return 'Проверка временно недоступна: состояние данных изменилось. Обновите страницу.';
  if (status === 503 || status === 500) return 'Сервис экспериментов недоступен. Возможно, схема ещё не подготовлена. Данные не загружены; нули не подставлены.';
  return 'Не удалось получить данные экспериментов. Проверьте соединение и повторите запрос. Нулевые показатели не подставлены.';
}
