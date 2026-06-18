import { useState, useEffect } from 'react';

// Import translation files
import enTranslations from '../locales/en.json';
import ruTranslations from '../locales/ru.json';
import kkTranslations from '../locales/kk.json';

const translations = {
  en: enTranslations,
  ru: ruTranslations,
  kk: kkTranslations
};

export type Language = 'en' | 'ru' | 'kk';

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>('kk'); // Изменено на казахский по умолчанию

  useEffect(() => {
    // Try to get language from localStorage or default to Kazakh
    let savedLang: Language = 'kk'; // Изменено на казахский по умолчанию
    
    if (typeof window !== 'undefined') {
      // Try to get from localStorage
      const storedLang = localStorage.getItem('language') as Language;
      if (storedLang && ['en', 'ru', 'kk'].includes(storedLang)) {
        savedLang = storedLang;
      }
    }
    
    setLanguage(savedLang);
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLanguage);
    }
  };

  const t = (key: keyof typeof enTranslations): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return {
    language,
    changeLanguage,
    t
  };
};