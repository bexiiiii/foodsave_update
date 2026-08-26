"use client";

import { useEffect } from "react";
import { BellOff, ChevronLeft } from "lucide-react";
import Link from "next/link";
import BottomNav from "../../components/BottomNav";

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
        <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-black">Уведомления</h1>
        <div className="w-10" />
      </header>

      <main className="flex min-h-[65vh] flex-col items-center justify-center px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-black/45">
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
