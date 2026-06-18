"use client";

import { ArrowLeft, MessageCircle, Phone, Mail, Clock } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {

  const handleTelegramSupport = () => {
    window.open('https://t.me/FoodSave_kz', '_blank');
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
           <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Поддержка</h1>
        </div>
      </div>

      {/* Support Hero */}
      <div className="flex flex-col items-center mt-8 px-4">
        <div className="w-24 h-24 bg-[#73be61] rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
        
        <h2 className="text-2xl font-bold text-black text-center mb-2 font-inter">
          Мы готовы помочь!
        </h2>
        <p className="text-gray-600 text-center text-base font-inter leading-relaxed max-w-sm">
          Есть вопросы о заказе или нужна помощь? Наша команда поддержки всегда на связи
        </p>
      </div>

      {/* Contact Methods */}
      <div className="px-4 mt-8">
        <div className="space-y-4">
          {/* Telegram Support */}
          <button
            onClick={handleTelegramSupport}
            className="w-full bg-[#73be61] rounded-2xl p-6 transition-all duration-300 hover:bg-[#68a356] active:scale-95"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold text-lg font-inter">Telegram</h3>
                <p className="text-white/80 text-sm font-inter">@FoodSave_kz</p>
              </div>
              <div className="text-white/60">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </button>

          {/* Email Support */}
          <div className="bg-gray-100 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-black font-semibold text-lg font-inter">Email</h3>
                <p className="text-gray-600 text-sm font-inter">support@foodsave.kz</p>
              </div>
            </div>
          </div>

          {/* Phone Support */}
          <div className="bg-gray-100 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-black font-semibold text-lg font-inter">Телефон</h3>
                <p className="text-gray-600 text-sm font-inter">+7 (700) 123-45-67</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="px-4 mt-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-black font-semibold text-base font-inter mb-2">Время работы поддержки</h3>
              <div className="space-y-1 text-sm font-inter">
                <p className="text-gray-700">Понедельник - Пятница: 09:00 - 18:00</p>
                <p className="text-gray-700">Суббота - Воскресенье: 10:00 - 16:00</p>
              </div>
              <p className="text-amber-700 text-xs font-inter mt-3">
                Telegram поддержка работает 24/7
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Quick Links */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-semibold text-black mb-4 font-inter">Часто задаваемые вопросы</h3>
        <div className="space-y-3">
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-black font-inter">Как отменить заказ?</h4>
            <p className="text-gray-600 text-sm font-inter mt-1">Перейдите в раздел &quot;Мои заказы&quot; и нажмите &quot;Отменить&quot;</p>
          </div>
          
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-black font-inter">Когда будет готов заказ?</h4>
            <p className="text-gray-600 text-sm font-inter mt-1">Время готовности указано в деталях заказа</p>
          </div>
          
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="font-medium text-black font-inter">Как изменить адрес доставки?</h4>
            <p className="text-gray-600 text-sm font-inter mt-1">Обратитесь в поддержку до подтверждения заказа</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </Link>
          
          <Link href="/markets" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/orders" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:bg-gray-50">
              <svg className="w-6 h-6 text-black transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 bg-[#73be61] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95">
              <svg className="w-6 h-6 text-white transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}