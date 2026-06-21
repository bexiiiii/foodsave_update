"use client";

import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import BottomNavigation from "../../components/BottomNavigation";

export default function NotificationsPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        
        <h1 className="text-base font-bold text-black">Уведомления</h1>
        
        <div className="w-10"></div>
      </div>

      {/* Empty State */}
      <div className="flex items-center justify-center px-8 min-h-[60vh]">
        <p className="text-base text-center text-black/50 leading-relaxed">
          Пока нет никаких уведомлени
        </p>
      </div>

      <BottomNavigation />
    </div>
  );
}
