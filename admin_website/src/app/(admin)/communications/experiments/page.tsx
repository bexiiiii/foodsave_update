"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { growthApiError, growthExperimentsApi } from '@/services/growthExperiments';
import type { GrowthAssignmentPreview, GrowthDispatchPreview, GrowthExperiment, GrowthMeasurement } from '@/types/growthExperiments';
import { armLabels, cohortLabels, formatGrowthCount, formatGrowthDate, formatGrowthItt, growthReasonLabel, MAX_PREVIEW_ID, parsePreviewId } from '@/utils/growthExperiments';

const panel = 'rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900';
const inputStyle = 'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white';
const buttonStyle = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800';

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{message}</p>;
}

function MeasurementCard({ measure, zone }: { measure: GrowthMeasurement; zone: string }) {
  const count = formatGrowthCount;
  return (
    <article className={panel}>
      <h3 className="font-semibold">{cohortLabels[measure.cohort] ?? measure.cohort} · {armLabels[measure.arm] ?? measure.arm}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Всего включено: {count(measure.assignedUsers)} · Срез: {formatGrowthDate(measure.asOf, zone)}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <caption className="sr-only">Результаты заказов по зрелым окнам наблюдения</caption>
          <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th scope="col" className="py-2 pr-4">Показатель</th><th scope="col" className="py-2 pr-4">D7</th><th scope="col" className="py-2">D14: сохранность заказов D0–D7</th></tr></thead>
          <tbody>
            <tr><th scope="row" className="py-2 pr-4 font-normal">Зрелые / все участники</th><td>{count(measure.d7MatureUsers)} / {count(measure.assignedUsers)}</td><td>{count(measure.d14MatureUsers)} / {count(measure.assignedUsers)}</td></tr>
            <tr><th scope="row" className="py-2 pr-4 font-normal">Окно ещё не завершено</th><td>{count(measure.d7ImmatureUsers)}</td><td>{count(measure.d14ImmatureUsers)}</td></tr>
            <tr><th scope="row" className="py-2 pr-4 font-normal">Достигли цели / зрелые участники</th><td>{count(measure.d7ConvertedUsers)} / {count(measure.d7MatureUsers)}</td><td>{count(measure.d14RetainedUsers)} / {count(measure.d14MatureUsers)}</td></tr>
            <tr><th scope="row" className="py-2 pr-4 font-normal">ITT: доля от всех включённых</th><td className="pr-4">{formatGrowthItt(measure.d7IttRate, measure.assignedUsers, measure.d7MatureUsers)}</td><td>{formatGrowthItt(measure.d14IttRate, measure.assignedUsers, measure.d14MatureUsers)}</td></tr>
            <tr><th scope="row" className="py-2 pr-4 font-normal">Чистые заказы зрелых участников</th><td>{count(measure.d7CleanOrders)}</td><td>{count(measure.d14RetainedOrders)} сохранились · {count(measure.d14CancelledOrders)} отменены</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">D7, только зрелые: второй или следующий чистый заказ у {count(measure.d7AnySecondOrNextUsers)} пользователей; повтор в другой календарный день у {count(measure.d7DifferentDayRepeatUsers)} пользователей</p>
      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="text-sm font-semibold">Подтверждённые выдачи отдельно от заказов</h4>
        <p className="mt-1 text-sm">D7: {count(measure.d7PickupUsers)} пользователей из {count(measure.d7MatureUsers)} зрелых · {count(measure.d7PickupOrders)} выдач</p>
        <p className="mt-1 text-sm">D14: {count(measure.d14PickupUsers)} пользователей из {count(measure.d14MatureUsers)} зрелых · {count(measure.d14PickupOrders)} выдач заказов D0–D7</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Учитывается подтверждённое время выдачи, а не только статус COMPLETED</p>
      </div>
    </article>
  );
}

function ExperimentsConsole() {
  const [experiments, setExperiments] = useState<GrowthExperiment[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [experiment, setExperiment] = useState<GrowthExperiment | null>(null);
  const [measurements, setMeasurements] = useState<GrowthMeasurement[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [assignmentPreview, setAssignmentPreview] = useState<GrowthAssignmentPreview | null>(null);
  const [dispatchPreview, setDispatchPreview] = useState<GrowthDispatchPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewRequest = useRef(0);
  const userId = parsePreviewId(userInput);
  const productId = parsePreviewId(productInput);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    setListError(null);
    setExperiments(null);
    growthExperimentsApi.list(controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      setExperiments(items);
      setSelectedId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? '');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setListError(growthApiError(error));
      setSelectedId('');
    }).finally(() => { if (!controller.signal.aborted) setLoadingList(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    previewRequest.current += 1;
    setAssignmentPreview(null);
    setDispatchPreview(null);
    setPreviewError(null);
    setPreviewBusy(false);
    setExperiment(null);
    setMeasurements(null);
    setReportError(null);
    setLoadingReport(Boolean(selectedId));
    if (selectedId) {
      Promise.all([
        growthExperimentsApi.get(selectedId, controller.signal),
        growthExperimentsApi.measurements(selectedId, controller.signal),
      ]).then(([detail, report]) => {
        if (controller.signal.aborted) return;
        setExperiment(detail);
        setMeasurements(report);
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setReportError(growthApiError(error));
      }).finally(() => { if (!controller.signal.aborted) setLoadingReport(false); });
    }
    return () => { controller.abort(); previewRequest.current += 1; };
  }, [selectedId, refresh]);

  const clearPreview = () => {
    previewRequest.current += 1;
    setAssignmentPreview(null);
    setDispatchPreview(null);
    setPreviewError(null);
    setPreviewBusy(false);
  };

  const runPreview = async (dispatch: boolean) => {
    if (!selectedId || userId === null || (dispatch && productId === null) || previewBusy) return;
    const request = ++previewRequest.current;
    setPreviewBusy(true);
    setPreviewError(null);
    setAssignmentPreview(null);
    setDispatchPreview(null);
    try {
      if (dispatch && productId !== null) {
        const result = await growthExperimentsApi.dispatchPreview(selectedId, userId, productId);
        if (request === previewRequest.current) setDispatchPreview(result);
      } else {
        const result = await growthExperimentsApi.preview(selectedId, userId);
        if (request === previewRequest.current) setAssignmentPreview(result);
      }
    } catch (error) {
      if (request === previewRequest.current) setPreviewError(growthApiError(error));
    } finally {
      if (request === previewRequest.current) setPreviewBusy(false);
    }
  };

  return (
    <div className="space-y-5 p-4 text-gray-900 sm:p-6 lg:p-8 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/communications" className="text-sm text-brand-500 hover:underline">← Коммуникации</Link><h1 className="mt-2 text-2xl font-semibold">Эксперименты роста: предпросмотр</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Только чтение · SUPER_ADMIN · Не запуск рассылки</p></div>
        <button type="button" className={buttonStyle} disabled={loadingList || loadingReport} onClick={() => { clearPreview(); setRefresh((value) => value + 1); }}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loadingList || loadingReport ? 'animate-spin' : ''}`} />Обновить</button>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">Новые эксперименты и глобальная отправка по умолчанию выключены. Эта страница не включает эксперимент, не добавляет участников и не отправляет сообщения. Активный статус эксперимента сам по себе не разрешает отправку.</p>
      {listError && <ErrorNotice message={listError} />}
      {loadingList && <p role="status">Загрузка экспериментов…</p>}
      {experiments?.length === 0 && <p className={panel}>Экспериментов пока нет. Ничего не создано автоматически. Подготовка и изменения выполняются отдельно через защищённый API.</p>}
      {experiments && experiments.length > 0 && (
        <section className={panel}>
          <label htmlFor="growth-experiment" className="mb-2 block text-sm font-medium">Эксперимент (до 100 последних)</label>
          <select id="growth-experiment" className={`${inputStyle} w-full`} value={selectedId} onChange={(event) => { clearPreview(); setSelectedId(event.target.value); }}>
            {experiments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.enabled ? 'Активен' : 'Выключен'}</option>)}
          </select>
          {experiment && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{experiment.enabled ? 'Активен' : 'Выключен'} · Контроль: {(experiment.holdoutBps / 100).toFixed(2)}% · Создан: {formatGrowthDate(experiment.createdAt, experiment.measurementZone)} · Часовой пояс измерений: {experiment.measurementZone}</p>}
        </section>
      )}
      {reportError && <ErrorNotice message={reportError} />}
      {loadingReport && <p role="status">Загрузка отчёта…</p>}
      {experiment && !loadingList && (
        <>
          <section className={`${panel} space-y-4`}>
            <div><h2 className="text-lg font-semibold">Проверка одного пользователя без изменений</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Результат не сохраняет распределение и не разрешает запуск. Для проверки доставки укажите также ID бокса.</p></div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm">ID пользователя<input className={inputStyle} type="number" inputMode="numeric" min={1} max={MAX_PREVIEW_ID} step={1} value={userInput} onChange={(event) => { clearPreview(); setUserInput(event.target.value); }} aria-invalid={userInput !== '' && userId === null} /></label>
              <label className="grid gap-1 text-sm">ID бокса<input className={inputStyle} type="number" inputMode="numeric" min={1} max={MAX_PREVIEW_ID} step={1} value={productInput} onChange={(event) => { clearPreview(); setProductInput(event.target.value); }} aria-invalid={productInput !== '' && productId === null} /></label>
              <button type="button" className={buttonStyle} disabled={previewBusy || userId === null} onClick={() => runPreview(false)}>Предпросмотр группы</button>
              <button type="button" className={buttonStyle} disabled={previewBusy || userId === null || productId === null} onClick={() => runPreview(true)}>Проверить ограничения доставки</button>
            </div>
            {(userInput !== '' && userId === null || productInput !== '' && productId === null) && <p className="text-sm text-red-700 dark:text-red-300">ID должен быть целым числом от 1 до {MAX_PREVIEW_ID}, без дробей и экспоненты</p>}
            {previewBusy && <p role="status" className="text-sm">Проверка без отправки…</p>}
            {previewError && <ErrorNotice message={previewError} />}
            {assignmentPreview && <div role="status" className="space-y-1 text-sm"><p className="font-medium">{assignmentPreview.cohort ? cohortLabels[assignmentPreview.cohort] : 'Не относится к целевым когортам'}</p><p>{assignmentPreview.cohort ? armLabels[assignmentPreview.arm] : 'Распределение не применяется'} · {assignmentPreview.frozen ? 'Ранее сохранённое распределение' : 'Только расчёт, пользователь не включён'}</p><p>Чистых заказов на исходную дату: {formatGrowthCount(assignmentPreview.baselineCleanCount)} · Последний: {formatGrowthDate(assignmentPreview.baselineLastCleanAt, experiment.measurementZone)}</p><p>{assignmentPreview.frozen ? 'Дата включения' : 'Дата расчёта'}: {formatGrowthDate(assignmentPreview.assignedAt, experiment.measurementZone)}</p></div>}
            {dispatchPreview && <div className="space-y-3 text-sm"><p role="status" className="font-medium">{dispatchPreview.eligible ? 'Проверки пройдены на момент запроса. Сообщение не отправлено.' : 'Доставка заблокирована. Сообщение не отправлено.'}</p><p>Глобальная отправка: {dispatchPreview.globalEnabled ? 'включена' : 'выключена'} · Эксперимент: {dispatchPreview.experimentEnabled ? 'активен' : 'выключен'}</p><ul className="list-disc space-y-1 pl-5">{dispatchPreview.reasons.map((reason) => <li key={reason}>{growthReasonLabel(reason)} <span className="text-xs text-gray-500">({reason})</span></li>)}</ul>{dispatchPreview.distanceKm !== null && <p>Расстояние: {Number.isFinite(dispatchPreview.distanceKm) ? dispatchPreview.distanceKm.toFixed(1) : 'Недоступно'} км</p>}{dispatchPreview.pickupWindow && <p>Подтверждённое окно выдачи: {formatGrowthDate(dispatchPreview.pickupWindow.startsAt, 'Asia/Almaty')} – {formatGrowthDate(dispatchPreview.pickupWindow.endsAt, 'Asia/Almaty')} (Asia/Almaty)</p>}{dispatchPreview.message && <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950"><p className="mb-2 font-medium">Текст предпросмотра (без отправки)</p><p className="whitespace-pre-wrap break-words">{dispatchPreview.message}</p></div>}</div>}
          </section>
          <section className="space-y-4">
            <div><h2 className="text-lg font-semibold">Результаты по исходному распределению (ITT)</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">В «все участники» входят контроль, пропуски, ошибки и пользователи без отправки. D7 и D14 показаны с отдельными зрелыми знаменателями. Итоговый ITT появится только после завершения окна у всей группы.</p><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Чистый заказ: исключены только CANCELLED, CANCELLED_BY_USER и CANCELLED_BY_PARTNER. Цель D7: первый, второй или следующий чистый заказ по исходной когорте. D14 проверяет сохранность этих заказов. Выдачи показаны отдельно.</p></div>
            {measurements?.length === 0 && <p className={panel}>Участников пока нет. Данные измерений отсутствуют; это не нулевая конверсия.</p>}
            {measurements?.map((measure) => <MeasurementCard key={`${measure.cohort}-${measure.arm}`} measure={measure} zone={experiment.measurementZone} />)}
          </section>
        </>
      )}
    </div>
  );
}

export default function GrowthExperimentsPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="p-6">Проверка доступа…</p>;
  if (!user || String(user.role) !== 'SUPER_ADMIN') return <div className="p-6"><ErrorNotice message="Раздел экспериментов доступен только супер-администратору." /><Link href="/communications" className="mt-4 inline-block text-brand-500">Вернуться к коммуникациям</Link></div>;
  return <ExperimentsConsole />;
}
