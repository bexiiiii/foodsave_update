"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "../lib/api";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://foodsave.kz/api";
const cancellationType = "ORDER_CANCELLED_BY_STAFF";
const supportUrl = "https://t.me/FoodSave_kz";
interface CustomerNotification { id: number; title: string; message: string; type: string; read: boolean; createdAt: string; }

function token() { try { return getAuthToken(); } catch { return null; } }
export function parseNotifications(value: unknown): CustomerNotification[] {
  if (!Array.isArray(value)) throw new Error("Invalid notifications response");
  return value.filter((item): item is CustomerNotification => item !== null && typeof item === "object"
    && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.title === "string"
    && typeof item.message === "string" && typeof item.type === "string" && typeof item.read === "boolean");
}

function useCustomerNotifications() {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    let active = true, busy = false, lastToken: string | null = null;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      const auth = token();
      if (auth !== lastToken) { setItems([]); lastToken = auth; }
      setSignedIn(Boolean(auth));
      if (!auth) { setLoading(false); setError(false); return; }
      busy = true;
      try {
        const response = await fetch(`${apiBase}/notifications`, { headers: { Authorization: `Bearer ${auth}` }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Notifications unavailable");
        const next = parseNotifications(await response.json());
        if (active && auth === token()) { setItems(next); setError(false); }
      } catch {
        if (active && auth === token()) setError(true);
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 20000);
    const events = ["focus", "storage", "foodsave:notification-created", "foodsave:notifications-updated", "foodsave:order-status-changed"];
    events.forEach(event => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller.abort(); window.clearInterval(interval); events.forEach(event => window.removeEventListener(event, refresh)); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const markRead = async (id: number) => {
    const auth = token();
    if (!auth || pending !== null) return;
    setPending(id);
    try {
      const response = await fetch(`${apiBase}/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${auth}` } });
      if (!response.ok) throw new Error("Cannot mark notification read");
      if (auth === token()) { setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item)); setError(false); window.dispatchEvent(new Event("foodsave:notifications-updated")); }
    } catch { if (auth === token()) setError(true); }
    finally { setPending(null); }
  };
  return { items, loading, error, signedIn, pending, markRead };
}

const styles = `
.fs-customer-notice { position: fixed; z-index: 100; top: calc(env(safe-area-inset-top, 0px) + var(--tg-safe-area-top, 0px) + 12px); left: 16px; right: 16px; max-width: 400px; margin: 0 auto; padding: 20px; border-radius: 16px; color: #17241d; font-family: Inter, system-ui, sans-serif; box-sizing: border-box; }
.fs-customer-notice h2, .fs-notification h2 { margin: 0 36px 8px 0; font-size: 16px; line-height: 22px; font-weight: 600; }
.fs-customer-notice p, .fs-notification p { margin: 0; font-size: 14px; line-height: 21px; white-space: pre-wrap; overflow-wrap: anywhere; }
.fs-notification-close { position: absolute; right: 8px; top: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 0; background: transparent; color: #66736b; cursor: pointer; }
.fs-notification-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.fs-notification-support, .fs-notification-read { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 14px; border-radius: 12px; border: 0; background: #edf7f0; color: #286043; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; }
.fs-notification-read { background: #f3f4f3; color: #43584a; }
.fs-notification-actions a:focus-visible, .fs-notification-actions button:focus-visible, .fs-notification-close:focus-visible { outline: 2px solid #4cad73; outline-offset: 3px; }
.fs-notification-actions button:disabled, .fs-notification-close:disabled { opacity: .5; cursor: wait; }
.fs-notification-error { margin-top: 12px !important; color: #a23c34; font-size: 13px !important; }
.fs-notification-list { max-width: 640px; margin: 0 auto; padding: 24px 16px; display: grid; gap: 12px; }
.fs-notification { padding: 20px; border-radius: 16px; color: #17241d; }
.fs-notification[data-unread="true"] { border-left: 3px solid #4cad73; }
.fs-notification time { display: block; margin-bottom: 8px; color: #748078; font-size: 12px; }
.fs-notification-empty { text-align: center; padding: 64px 12px; color: #66736b; font-size: 14px; line-height: 22px; }
`;

function SupportLink() { return <a className="fs-notification-support" href={supportUrl} target="_blank" rel="noopener noreferrer" onClick={event => { try { const tg = window.Telegram?.WebApp; if (tg?.openTelegramLink) { tg.openTelegramLink(supportUrl); event.preventDefault(); } } catch { /* Native link remains available. */ } }}>Написать в поддержку</a>; }

export default function CustomerCancellationNotice() {
  const { items, error, pending, markRead } = useCustomerNotifications();
  const item = items.find(item => item.type === cancellationType && !item.read);
  if (!item || (typeof window !== "undefined" && window.location.pathname === "/notifications")) return null;
  return <aside className="fs-surface fs-customer-notice" role="status" aria-live="polite" aria-label="Отмена заказа">
    <style>{styles}</style>
    <button className="fs-notification-close" aria-label="Прочитать и закрыть уведомление" disabled={pending !== null} onClick={() => void markRead(item.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    <h2>{item.title}</h2><p>{item.message}</p>
    <div className="fs-notification-actions"><SupportLink /><a href="/notifications" style={{ color: "#43584a", fontSize: 13 }}>Все уведомления</a></div>
    {error && <p className="fs-notification-error">Не удалось обновить уведомления. Попробуйте ещё раз.</p>}
  </aside>;
}

export function NotificationsInbox() {
  const { items, loading, error, signedIn, pending, markRead } = useCustomerNotifications();
  return <main className="fs-notification-list"><style>{styles}</style>
    {loading && <p className="fs-notification-empty" role="status">Загружаем уведомления…</p>}
    {!loading && !signedIn && <p className="fs-notification-empty">Откройте Mini App через Telegram, чтобы увидеть свои уведомления.</p>}
    {error && <div role="alert"><p className="fs-notification-error">Не удалось загрузить уведомления.</p><button className="fs-notification-read" onClick={() => window.dispatchEvent(new Event("foodsave:notifications-updated"))}>Повторить</button></div>}
    {!loading && signedIn && !error && items.length === 0 && <div className="fs-notification-empty"><h2>Уведомлений пока нет</h2><p>Здесь появятся важные сообщения о ваших заказах и предложениях FoodSave.</p></div>}
    {items.map(item => <article key={item.id} className="fs-surface fs-notification" data-unread={!item.read}>
      {item.createdAt && <time>{new Date(item.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</time>}
      <h2>{item.title}</h2><p>{item.message}</p>
      <div className="fs-notification-actions">{item.type === cancellationType && <SupportLink />}{!item.read && <button className="fs-notification-read" disabled={pending !== null} onClick={() => void markRead(item.id)}>{pending === item.id ? "Сохраняем…" : "Прочитано"}</button>}</div>
    </article>)}
  </main>;
}
