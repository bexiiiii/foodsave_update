"use client";

import Link from "next/link";
import { Home, Search, MessageCircle } from "lucide-react";

export default function NotFound() {

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Empty Food Box Illustration */}
      <div className="mb-8">
        <div className="w-32 h-32 bg-gray-100 rounded-3xl flex items-center justify-center relative">
          {/* Empty box icon */}
          <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          
          {/* Sad face */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#4CAD73] rounded-full flex items-center justify-center">
            <div className="text-white text-lg">😔</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-black mb-2 font-inter">
          Страница не найдена
        </h1>
        <p className="text-gray-600 text-base font-inter leading-relaxed max-w-sm">
          Похоже, эта страница потерялась как последний кусочек пиццы в холодильнике
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        <Link 
          href="/"
          className="w-full bg-[#4CAD73] text-white py-4 px-6 rounded-2xl font-semibold text-center block transition-all duration-300 hover:bg-[#429565] active:scale-95 font-inter"
        >
          <div className="flex items-center justify-center gap-2">
            <Home className="w-5 h-5" />
            На главную
          </div>
        </Link>
        
        <Link 
          href="/markets"
          className="w-full bg-gray-100 text-black py-4 px-6 rounded-2xl font-semibold text-center block transition-all duration-300 hover:bg-gray-200 active:scale-95 font-inter"
        >
          <div className="flex items-center justify-center gap-2">
            <Search className="w-5 h-5" />
            Найти магазины
          </div>
        </Link>
      </div>

      {/* Support Link */}
      <div className="text-center">
        <p className="text-gray-500 text-sm font-inter mb-2">
          Нужна помощь?
        </p>
        <button
          onClick={() => {
            // Используем стандартный способ открытия ссылки в Telegram
            window.open('https://t.me/FoodSave_kz', '_blank');
          }}
          className="text-[#4CAD73] font-semibold text-sm font-inter flex items-center gap-1 mx-auto transition-colors hover:text-[#429565]"
        >
          <MessageCircle className="w-4 h-4" />
          Написать в поддержку
        </button>
      </div>

      {/* Decorative Food Items */}
      <div className="absolute top-20 left-8 w-12 h-12 bg-[#de8a08] rounded-2xl opacity-20 rotate-12"></div>
      <div className="absolute top-32 right-12 w-8 h-8 bg-[#4CAD73] rounded-xl opacity-20 -rotate-12"></div>
      <div className="absolute bottom-32 left-12 w-10 h-10 bg-[#ff6b6b] rounded-2xl opacity-20 rotate-45"></div>
      <div className="absolute bottom-20 right-8 w-6 h-6 bg-[#de8a08] rounded-lg opacity-20 -rotate-45"></div>
    </div>
  );
}