"use client";

import { useEffect } from "react";
import { ArrowLeft, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useTelegram } from "../../hooks/useTelegram";

export default function ProfilePage() {
  const { user } = useAuth();
  const { } = useTelegram(); // Initialize Telegram singleton

  useEffect(() => {
    // No additional logic needed, Telegram is initialized by hook
  }, []);

  const getDisplayName = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('User data in profile:', user);
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.telegramUsername) {
      return user.telegramUsername;
    }
    return user?.username || "Пользователь";
  };

  const getUsername = () => {
    if (user?.telegramUsername) {
      return `@${user.telegramUsername}`;
    }
    if (user?.username) {
      return `@${user.username}`;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
           <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Профиль</h1>
        </div>
      </div>

      {/* Profile Avatar & Info */}
      <div className="flex flex-col items-center mt-8">
        <div className="w-20 h-20 bg-[#73be61] rounded-full flex items-center justify-center overflow-hidden">
          {user?.telegramPhotoUrl ? (
            <img 
              src={user.telegramPhotoUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-white" strokeWidth={2} />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-black mt-6 font-inter">{getDisplayName()}</h2>
        {getUsername() && (
          <p className="text-sm font-medium text-black/50 mt-1 font-inter">{getUsername()}</p>
        )}
        {user?.email && !user.email.includes('@telegram.local') && (
          <p className="text-sm font-medium text-black/50 mt-1 font-inter">{user.email}</p>
        )}
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-12">
        <div className="bg-gray-100 rounded-2xl overflow-hidden">
          <Link href="/language" className="flex items-center justify-between px-6 py-4 border-b border-gray-300 hover:bg-gray-200 transition-colors">
            <span className="text-base font-medium text-black font-inter">Язык</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </Link>
          
          <button 
            onClick={() => {
              // Открываем Telegram аккаунт поддержки
              window.open('https://t.me/FoodSave_kz', '_blank');
            }}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-200 transition-colors w-full text-left"
          >
            <span className="text-base font-medium text-black font-inter">Поддержка</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </Link>
          
          <Link href="/markets" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/orders" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </Link>
          
          <Link href="/profile" className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-[#73be61] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
