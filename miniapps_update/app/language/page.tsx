"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation, Language } from "../../hooks/useTranslation";
import BackButton from "../../components/BackButton";
import BottomNav from "../../components/BottomNav";

const languages = [
  { id: "kk" as Language, name: "Қазақша", flag: "🇰🇿" },
  { id: "ru" as Language, name: "Русский", flag: "🇷🇺" },
  { id: "en" as Language, name: "English", flag: "🇺🇸" },
];

export default function LanguagePage() {
  const { language, changeLanguage } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const getReturnPath = () => {
    if (typeof window === "undefined") return "/profile";
    const storedPath = sessionStorage.getItem("languageReturnTo");
    return storedPath && storedPath !== "/language" ? storedPath : "/profile";
  };

  const handleLanguageChange = (lang: Language) => {
    changeLanguage(lang);
    router.replace(getReturnPath());
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <BackButton fallback={getReturnPath()} />
          <h1 className="text-xl font-bold text-black font-inter">Тіл / Язык / Language</h1>
        </div>
      </div>

      {/* Language List */}
      <div className="px-4 mt-8">
        <div className="fs-surface rounded-2xl overflow-hidden divide-y divide-black/[0.06]">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${language === lang.id ? "bg-[#F1F8F3]" : "bg-white hover:bg-[#FAFCFA]"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <span className="text-base font-medium text-black font-inter">{lang.name}</span>
              </div>
              {language === lang.id && (
                <div className="w-5 h-5 bg-[#4CAD73] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
