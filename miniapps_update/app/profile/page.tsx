"use client";

import { useEffect } from "react";
import { ArrowLeft, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useTelegram } from "../../hooks/useTelegram";
import BottomNavigation from "../../components/BottomNavigation";

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
          <Link href="/language?returnTo=%2Fprofile" className="flex items-center justify-between px-6 py-4 border-b border-gray-300 hover:bg-gray-200 transition-colors">
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

      <BottomNavigation />
    </div>
  );
}
