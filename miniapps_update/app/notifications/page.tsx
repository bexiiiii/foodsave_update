"use client";

import { useEffect } from "react";
import { NotificationsInbox } from "../../components/CustomerNotifications";
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

      <NotificationsInbox />

      <BottomNav active="home" />
    </div>
  );
}
