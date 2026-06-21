"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation, Language } from "../../hooks/useTranslation";
import BottomNavigation from "../../components/BottomNavigation";

const languages = [
  { id: "kk" as Language, name: "Қазақша", flag: "🇰🇿" },
  { id: "ru" as Language, name: "Русский", flag: "🇷🇺" },
  { id: "en" as Language, name: "English", flag: "🇺🇸" },
];

const getSafeReturnTo = (value: string | null) => {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/profile";
};

export default function LanguagePage() {
  const { language, changeLanguage } = useTranslation();
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/profile");

  useEffect(() => {
    setReturnTo(getSafeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleLanguageChange = (newLanguage: Language) => {
    changeLanguage(newLanguage);
    router.replace(returnTo);
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href={returnTo} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Тіл / Язык / Language</h1>
        </div>
      </div>

      <div className="px-4 mt-8">
        <div className="bg-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-300">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <span className="text-base font-medium text-black font-inter">{lang.name}</span>
              </div>
              {language === lang.id && (
                <div className="w-5 h-5 bg-[#73be61] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
