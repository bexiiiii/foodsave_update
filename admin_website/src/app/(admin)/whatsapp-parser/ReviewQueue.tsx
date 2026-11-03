"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WhatsAppParserCatalogItem, WhatsAppParserItem, WhatsAppParserReviewItem, whatsappParserApi } from "@/services/api";

const money = (value?: number) => value == null ? "" : String(value);

function ParserImage({ path }: { path: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSource("");
    if (!path || /^https?:\/\//i.test(path)) return () => { active = false; };
    whatsappParserApi.getImage(path).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setSource(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if (active) setSource(""); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return source
    ? <img src={source} alt="Фото позиции из каталога" className="mb-3 max-h-64 max-w-full rounded border object-contain" />
    : <p className="mb-3 text-xs text-gray-500">Фото не загружено для проверки.</p>;
}

export default function ReviewQueue() {
  const [rows, setRows] = useState<WhatsAppParserReviewItem[]>([]);
  const [catalog, setCatalog] = useState<WhatsAppParserCatalogItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, WhatsAppParserItem>>({});
  const [busy, setBusy] = useState("");

  const reload = async () => {
    try {
      const [queue, menu] = await Promise.all([whatsappParserApi.getReviewQueue(), whatsappParserApi.getCatalog()]);
      setRows(queue.items);
      setCatalog(menu.items);
      setDrafts(Object.fromEntries(queue.items.map((row) => [row.reviewId, { ...row.item }])));
    } catch { toast.error("Не удалось загрузить очередь модерации"); }
  };

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => { void reload(); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const act = async (id: string, action: "save" | "publish" | "reject" | "snooze" | "reconcile-published" | "reconcile-not-published") => {
    if (action === "reconcile-published" && !window.confirm("Вы проверили CRM и подтвердили, что товар уже создан?")) return;
    if (action === "reconcile-not-published" && !window.confirm("Вы проверили CRM и подтвердили, что товара нет? После этого разрешится повторная публикация.")) return;
    setBusy(id);
    try {
      const item = drafts[id];
      if (action === "save") await whatsappParserApi.editReviewItem(id, item);
      if (action === "publish") {
        await whatsappParserApi.editReviewItem(id, item);
        const result = await whatsappParserApi.publishReviewItem(id);
        if (result.duplicatePublication) {
          const confirmed = window.confirm(
            `Позиция совпадает с уже опубликованной или пока не сверенной карточкой (${result.duplicateReviewId}). Создать ещё одну после вашей проверки?`,
          );
          if (!confirmed) { await reload(); return; }
          await whatsappParserApi.publishReviewItem(id, true);
        }
      }
      if (action === "reject") await whatsappParserApi.rejectReviewItem(id);
      if (action === "snooze") await whatsappParserApi.snoozeReviewItem(id);
      if (action === "reconcile-published") await whatsappParserApi.reconcilePublishedReviewItem(id);
      if (action === "reconcile-not-published") await whatsappParserApi.reconcileUnpublishedReviewItem(id);
      toast.success(action === "publish" ? "Позиция отправлена" : action === "reject" ? "Позиция отклонена" : action === "snooze" ? "Позиция отложена" : action === "reconcile-published" ? "Зафиксировано: товар есть в CRM" : action === "reconcile-not-published" ? "Позиция возвращена в очередь" : "Изменения сохранены");
      await reload();
    } catch { toast.error("Не удалось выполнить действие"); }
    finally { setBusy(""); }
  };

  const update = (id: string, patch: Partial<WhatsAppParserItem>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  return <section className="mt-6 border border-amber-200 bg-white dark:border-amber-900 dark:bg-gray-900">
    <div className="border-b border-amber-100 p-4 dark:border-amber-900"><h2 className="font-semibold">На модерации ({rows.length})</h2><p className="mt-1 text-sm text-gray-500">Сомнительные позиции сохраняются после закрытия страницы.</p></div>
    <div className="space-y-4 p-4">
      {rows.map((row) => {
        const item = drafts[row.reviewId] || row.item;
        const product = catalog.find((entry) => entry.canonical === item.matchedCanonical);
        const variants = Object.keys(product?.sizes || {});
        const isPate = item.catalogScope === "pate"
          || `${row.chatName || ""} ${item.storeName || ""}`.toLowerCase().includes("пате")
          || `${row.chatName || ""} ${item.storeName || ""}`.toLowerCase().includes("pate");
        const editable = ["PENDING", "SNOOZED"].includes(row.status);
        const outcomeUnknown = row.status === "PUBLISH_UNKNOWN";
        const publishing = row.status === "PUBLISHING";
        const imagePath = Array.isArray(item.images) ? String(item.images[0] || "") : "";
        const rowReason = (item.reviewReasons || []).join(" · ") || item.error
          || (item.needsReview ? "Проверьте распознанную позицию" : "Готово к публикации");
        return <article key={row.reviewId} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><strong>{row.chatName || item.storeName || "Сообщение"}</strong><p className="mt-1 text-xs text-amber-700">{rowReason}</p></div><span className="text-xs text-gray-500">{row.status}</span></div>
          {publishing ? <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-700">Запрос в CRM ещё выполняется. Сверка результата сейчас недоступна.</p> : null}
          {outcomeUnknown ? <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">Результат отправки неизвестен. Автоповтор заблокирован. После проверки CRM выберите ниже подтверждённый результат.</p> : null}
          {Boolean(item.photoIsFallback) ? <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-700">Точного фото позиции нет; используется общее фото заведения.</p> : null}
          {Boolean(item.photoNeedsReview) ? <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{String(item.photoReviewReason || "Проверьте фото товара")}</p> : null}
          {imagePath ? <ParserImage path={imagePath} /> : <p className="mb-3 text-xs text-gray-500">Фото позиции не найдено.</p>}
          {Boolean(item.photoIsFallback && Array.isArray(item.images) && item.images.length) ? <label className="mb-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900"><input disabled={!editable} type="checkbox" checked={Boolean(item.confirmFallbackPhoto ?? item.photoFallbackConfirmed)} onChange={(e) => update(row.reviewId, { confirmFallbackPhoto: e.target.checked })}/><span>Я проверил позицию и разрешаю публикацию с общим фото заведения.</span></label> : null}
          {row.messageText ? <p className="mb-3 rounded bg-gray-50 p-2 text-sm text-gray-600 dark:bg-gray-800">{row.messageText}</p> : <p className="mb-3 text-xs text-gray-400">Исходный текст очищен по сроку хранения; данные позиции сохранены.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {isPate ? <>
              <label className="text-xs text-gray-500">Товар из каталога<select disabled={!editable} className="mt-1 h-10 w-full rounded border bg-white px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={String(item.matchedCanonical || "")} onChange={(e) => { const next = catalog.find((entry) => entry.canonical === e.target.value); update(row.reviewId, { matchedCanonical: next?.canonical || null, name: next?.canonical || "", description: next?.description || "", sizeDetected: null, confirmFallbackPhoto: false }); }}><option value="">Выберите товар</option>{catalog.map((entry) => <option key={entry.canonical} value={entry.canonical}>{entry.canonical}</option>)}</select></label>
              <label className="text-xs text-gray-500">Вариант<select disabled={!editable} className="mt-1 h-10 w-full rounded border bg-white px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={String(item.sizeDetected || "")} onChange={(e) => { const size = e.target.value; const price = product?.sizes?.[size]?.price; update(row.reviewId, { sizeDetected: size || null, name: size ? `${product?.canonical || item.name} (${size})` : product?.canonical || item.name, description: product?.description || item.description, ...(price ? { originalPrice: price, price: Math.min(Number(item.price || price), price) } : {}) }); }}><option value="">Выберите вариант</option>{variants.map((size) => <option key={size} value={size}>{size} — {money(product?.sizes?.[size]?.price)} ₸</option>)}</select></label>
            </> : <label className="text-xs text-gray-500">Название позиции<input disabled={!editable} type="text" className="mt-1 h-10 w-full rounded border px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={String(item.name || "")} onChange={(e) => update(row.reviewId, { name: e.target.value, confirmFallbackPhoto: false })}/></label>}
            <label className="text-xs text-gray-500">Цена предложения, ₸<input disabled={!editable} type="number" min="1" className="mt-1 h-10 w-full rounded border px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={money(item.price)} onChange={(e) => update(row.reviewId, { price: Number(e.target.value) })}/></label>
            <label className="text-xs text-gray-500">Обычная цена, ₸<input disabled={!editable} type="number" min="1" className="mt-1 h-10 w-full rounded border px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={money(item.originalPrice)} onChange={(e) => update(row.reviewId, { originalPrice: Number(e.target.value) })}/></label>
            <label className="text-xs text-gray-500">Количество<input disabled={!editable} type="number" min="1" className="mt-1 h-10 w-full rounded border px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={money(item.stockQuantity)} onChange={(e) => update(row.reviewId, { stockQuantity: Number(e.target.value) })}/></label>
            {!isPate ? <label className="text-xs text-gray-500">Описание<input disabled={!editable} type="text" className="mt-1 h-10 w-full rounded border px-2 text-sm disabled:opacity-50 dark:bg-gray-950" value={String(item.description || "")} onChange={(e) => update(row.reviewId, { description: e.target.value })}/></label> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{editable ? <><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "save")} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Сохранить</button><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "publish")} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">Сохранить и опубликовать</button><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "snooze")} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Отложить</button><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "reject")} className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50">Отклонить</button></> : null}{outcomeUnknown ? <><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "reconcile-published")} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50">В CRM уже есть</button><button disabled={busy === row.reviewId} onClick={() => void act(row.reviewId, "reconcile-not-published")} className="rounded border border-amber-400 px-3 py-2 text-sm text-amber-800 disabled:opacity-50">В CRM нет — разрешить повтор</button></> : null}</div>
        </article>;
      })}
      {!rows.length && <p className="py-6 text-center text-sm text-gray-500">Нет позиций на проверке</p>}
    </div>
  </section>;
}
