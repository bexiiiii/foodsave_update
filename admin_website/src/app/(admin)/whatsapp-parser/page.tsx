"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, LoaderCircle, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  WhatsAppParserEventsResponse,
  WhatsAppParserItem,
  whatsappParserApi,
} from "@/services/api";

const sources = [
  { value: "", label: "Определить из сообщения" },
  { value: "Coffi", label: "Coffi" },
  { value: "Royalty", label: "Royalty" },
  { value: "Pate", label: "Pate" },
];

const money = (value?: number) => value == null ? "-" : `${Math.round(value).toLocaleString("ru-KZ")} ₸`;

export default function WhatsAppParserPage() {
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const [items, setItems] = useState<WhatsAppParserItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [events, setEvents] = useState<WhatsAppParserEventsResponse["events"]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const response = await whatsappParserApi.getEvents();
      setEvents(response.events);
    } catch {
      toast.error("Не удалось загрузить журнал WhatsApp");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => { void loadEvents(); }, []);

  const selectedItems = useMemo(() => items.filter((_, index) => selected.has(index)), [items, selected]);
  const readyCount = items.filter((item) => !item.error && !item.needsReview).length;

  const parse = async () => {
    if (!message.trim()) {
      toast.error("Вставьте сообщение из WhatsApp");
      return;
    }
    setIsParsing(true);
    try {
      const result = await whatsappParserApi.parse(message, source || undefined);
      setItems(result.items);
      setSelected(new Set(result.items.map((item, index) => !item.error && !item.needsReview ? index : -1).filter(index => index >= 0)));
      toast.success(`Разобрано позиций: ${result.summary.total}`);
    } catch {
      toast.error("Не удалось разобрать сообщение");
    } finally {
      setIsParsing(false);
    }
  };

  const publish = async () => {
    if (!selectedItems.length) {
      toast.error("Выберите позиции для публикации");
      return;
    }
    setIsPublishing(true);
    try {
      const result = await whatsappParserApi.publish(selectedItems, true);
      toast.success(`Опубликовано: ${result.summary.ok}; на проверке: ${result.summary.skipped}`);
      await loadEvents();
    } catch {
      toast.error("Не удалось опубликовать выбранные позиции");
    } finally {
      setIsPublishing(false);
    }
  };

  const toggle = (index: number) => setSelected((current) => {
    const next = new Set(current);
    next.has(index) ? next.delete(index) : next.add(index);
    return next;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">WhatsApp-парсер</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Проверка, публикация и журнал сообщений Green API.</p>
        </div>
        <button onClick={() => void loadEvents()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <RefreshCw className={`h-4 w-4 ${isLoadingEvents ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      <section className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><ClipboardCheck className="h-4 w-4 text-brand-500" /> Ручная обработка</div>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
            {sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="p-4">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Вставьте сообщение из WhatsApp" className="min-h-36 w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
          <div className="mt-3 flex justify-end">
            <button onClick={() => void parse()} disabled={isParsing} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {isParsing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Разобрать
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Результат разбора</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Готово автоматически: {readyCount}. Выбрано: {selectedItems.length}.</p>
          </div>
          <button onClick={() => void publish()} disabled={isPublishing || !selectedItems.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900">
            {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Опубликовать выбранное
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400"><tr><th className="w-12 px-4 py-3"></th><th className="px-4 py-3">Позиция</th><th className="px-4 py-3">Заведение</th><th className="px-4 py-3">Цена</th><th className="px-4 py-3">Кол-во</th><th className="px-4 py-3">Статус</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, index) => {
                const unavailable = Boolean(item.error);
                return <tr key={`${item.name || item.rawLine}-${index}`} className={unavailable ? "bg-red-50/60 dark:bg-red-950/10" : ""}>
                  <td className="px-4 py-3"><input aria-label={`Выбрать ${item.name || item.rawLine || index + 1}`} type="checkbox" disabled={unavailable} checked={selected.has(index)} onChange={() => toggle(index)} className="h-4 w-4 accent-brand-500" /></td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white"><div>{item.name || item.rawLine || "Не распознано"}</div>{item.reviewReasons?.length ? <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{item.reviewReasons.join(", ")}</div> : null}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.storeName || "-"}</td>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900 dark:text-white">{money(item.price)}</div><div className="text-xs text-gray-500 line-through">{money(item.originalPrice)}</div></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{item.stockQuantity ?? "-"}</td>
                  <td className="px-4 py-3">{item.error ? <span className="inline-flex items-center gap-1 text-xs text-red-600"><TriangleAlert className="h-4 w-4" /> Ошибка</span> : item.needsReview ? <span className="inline-flex items-center gap-1 text-xs text-amber-600"><TriangleAlert className="h-4 w-4" /> Проверить</span> : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Готово</span>}</td>
                </tr>;
              })}
              {!items.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">Нет результатов разбора</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Журнал сообщений</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-950"><tr><th className="px-4 py-3">Время</th><th className="px-4 py-3">Группа</th><th className="px-4 py-3">Сообщение</th><th className="px-4 py-3">Разбор</th><th className="px-4 py-3">Публикация</th><th className="px-4 py-3">Результат</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {events.map((event, index) => <tr key={event.idMessage || index}><td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{event.receivedAt ? new Date(event.receivedAt * 1000).toLocaleString("ru-KZ") : "-"}</td><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{event.chatName || "-"}</td><td className="max-w-sm px-4 py-3 text-gray-600 dark:text-gray-300"><span className="block truncate">{event.text || "Медиа без подписи"}</span></td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{event.parse ? `${event.parse.total || 0} поз.` : "-"}</td><td className="px-4 py-3 text-gray-600 dark:text-gray-300">{event.upload ? `${event.upload.ok || 0}/${event.upload.total || 0}` : "-"}</td><td className="px-4 py-3">{event.error ? <span className="text-red-600">Ошибка</span> : event.ignored ? <span className="text-gray-500">Пропущено</span> : <span className="text-emerald-600">Обработано</span>}</td></tr>)}
          {!isLoadingEvents && !events.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Журнал пока пуст</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
