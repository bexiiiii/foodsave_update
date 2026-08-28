"use client";

import { useEffect } from "react";
import { BellOff } from "lucide-react";
import BottomNav from "../../components/BottomNav";
import BackButton from "../../components/BackButton";

export default function NotificationsPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-4 pt-4">
        <BackButton fallback="/" />
        <h1 className="text-xl font-bold text-black">Уведомления</h1>
        <div className="w-10" />
      </header>

      <main className="flex min-h-[65vh] flex-col items-center justify-center px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDF7F0] text-[#15551F] shadow-[0_8px_24px_rgba(21,85,31,0.08)]">
          <BellOff className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <h2 className="mt-5 text-lg font-bold text-black">Уведомлений пока нет</h2>
        <p className="mt-2 max-w-[280px] text-sm font-medium leading-relaxed text-black/45">
          Здесь появятся важные сообщения о ваших заказах и предложениях FoodSave.
        </p>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
